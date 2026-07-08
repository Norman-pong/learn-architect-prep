/**
 * 题库数据转换管道 (ETL)
 * 
 * 从外部数据源（GitHub 仓库、本地文件）拉取题库，转换为 PRD §6.3 标准 Schema，
 * 去重后统一入库到 data/quiz/*.json。
 * 
 * 使用方式：
 *   bun run scripts/transform.ts --source ./raw-questions.json
 *   bun run scripts/transform.ts --source https://raw.githubusercontent.com/.../questions.json
 *   bun run scripts/transform.ts --source-dir ./raw-data/
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, basename, join } from "node:path";
import { createHash } from "node:crypto";

const QUIZ_DIR = resolve(import.meta.dir, "../data/quiz");

// ============================================================
// PRD §6.3 标准 Schema
// ============================================================

interface StandardQuestion {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: string;
  explanation: string;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  hash: string;
  year?: number;
}

interface StandardCase {
  id: string;
  scenario: string;
  questions: string[];
  reference_answer: string;
  scoring_points: string[];
  chapter: string;
  source: string;
  hash: string;
}

interface StandardEssay {
  id: string;
  title: string;
  requirements: string[];
  reference_outline: string;
  source: string;
  hash: string;
  year?: number;
}

interface QuizBank<T> {
  version: string;
  updatedAt: string;
  questions: T[];
}

// ============================================================
// Hash 工具
// ============================================================

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function questionHash(q: Omit<StandardQuestion, "hash" | "id">): string {
  const sortedOptions: Record<string, string> = {};
  for (const key of Object.keys(q.options).sort()) {
    sortedOptions[key] = q.options[key];
  }
  return sha256(JSON.stringify({ question: q.question, options: sortedOptions }));
}

// ============================================================
// 格式检测与转换 (Transformers)
// ============================================================

/**
 * 已知的外部格式及转换规则。
 * 
 * 常见来源：
 * 1. xxlllq/system_architect — 字段名不同 (stem→question, rightKey→answer, analysis→explanation)
 * 2. xiaomabenten/system_architect — 不同的 JSON 结构
 * 3. 纯文本题库 — 每行一道题
 */
const TRANSFORMERS: Record<string, (item: any) => StandardQuestion> = {
  /** GitHub 真题格式 (xxlllq/system_architect 风格) */
  "github-legacy": (item: any) => ({
    id: `q-${sha256(item.stem || item.question || "").slice(0, 8)}`,
    question: item.stem || item.question || item.title || "",
    options: item.options || item.choices || { A: item.A, B: item.B, C: item.C, D: item.D },
    answer: item.rightKey || item.answer || item.correctAnswer || "",
    explanation: item.analysis || item.explanation || item.answerAnalysis || "",
    chapter: item.chapter || item.chapterId || item.section || "",
    difficulty: (["easy", "medium", "hard"].includes(item.difficulty) ? item.difficulty : "medium") as StandardQuestion["difficulty"],
    source: item.source || "远程拉取",
    hash: "",
    year: item.year ?? undefined,
  }),
  
  /** 标准格式（已是 PRD §6.3 Schema，只需补充 hash） */
  "standard": (item: any) => ({
    ...item,
    hash: "",
  }),
};

function detectFormat(item: any): string {
  // 检测 GitHub 旧格式特征字段
  if (item.stem || item.rightKey || item.analysis) return "github-legacy";
  // 默认按标准格式处理
  return "standard";
}

function transformQuestion(raw: any): StandardQuestion {
  const format = detectFormat(raw);
  const transformer = TRANSFORMERS[format] || TRANSFORMERS["standard"];
  const q = transformer(raw);
  q.hash = questionHash(q);
  return q;
}

// ============================================================
// 加载工具
// ============================================================

function loadBank<T>(file: string): QuizBank<T> {
  if (!existsSync(file)) {
    return { version: "1.0", updatedAt: new Date().toISOString(), questions: [] };
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

function saveBank<T>(file: string, bank: QuizBank<T>): void {
  bank.updatedAt = new Date().toISOString();
  writeFileSync(file, JSON.stringify(bank, null, 2), "utf8");
}

function dedup<T extends { hash: string }>(existing: T[], incoming: T[]): { added: T[]; skipped: T[] } {
  const hashSet = new Set(existing.map((q) => q.hash));
  const added: T[] = [];
  const skipped: T[] = [];
  for (const item of incoming) {
    if (hashSet.has(item.hash)) {
      skipped.push(item);
    } else {
      hashSet.add(item.hash);
      added.push(item);
    }
  }
  return { added, skipped };
}

// ============================================================
// 主流程
// ============================================================

interface ImportStats {
  total: number;
  added: number;
  skipped: number;
  errors: string[];
}

async function importQuestionsFromSource(raw: any[]): Promise<ImportStats> {
  const stats: ImportStats = { total: raw.length, added: 0, skipped: 0, errors: [] };
  const bankFile = join(QUIZ_DIR, "questions.json");
  const bank = loadBank<StandardQuestion>(bankFile);
  
  const transformed: StandardQuestion[] = [];
  for (const item of raw) {
    try {
      transformed.push(transformQuestion(item));
    } catch (err: any) {
      stats.errors.push(`转换失败: ${err.message} (item: ${JSON.stringify(item).substring(0, 100)})`);
    }
  }
  
  const { added, skipped } = dedup(bank.questions, transformed);
  bank.questions.push(...added);
  saveBank(bankFile, bank);
  
  stats.added = added.length;
  stats.skipped += skipped.length;
  return stats;
}

async function importFromUrl(url: string): Promise<ImportStats> {
  console.log(`📥 拉取: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  const data = await resp.json();
  
  // 自动探测 JSON 结构：直接数组 vs {questions:[]} vs {data:{questions:[]}}
  let raw: any[];
  if (Array.isArray(data)) raw = data;
  else if (Array.isArray(data.questions)) raw = data.questions;
  else if (data.data && Array.isArray(data.data.questions)) raw = data.data.questions;
  else if (data.data && Array.isArray(data.data)) raw = data.data;
  else throw new Error(`无法识别的 JSON 结构。顶层键: ${Object.keys(data).join(", ")}`);
  
  return importQuestionsFromSource(raw);
}

async function importFromFile(filePath: string): Promise<ImportStats> {
  console.log(`📄 文件: ${filePath}`);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  const raw = Array.isArray(data) ? data : (data.questions || data.data || []);
  return importQuestionsFromSource(raw);
}

// ============================================================
// CLI
// ============================================================

if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`用法: bun run scripts/transform.ts [选项]
  --source <url|path>   导入单个源
  --source-dir <dir>    批量导入目录下所有 JSON 文件
  --stats               查看当前题库统计`);
    process.exit(0);
  }
  
  if (args.includes("--stats")) {
    const q = loadBank<StandardQuestion>(join(QUIZ_DIR, "questions.json"));
    console.log(`📊 题库统计: ${q.questions.length} 题`);
    process.exit(0);
  }
  
  const sourceIdx = args.indexOf("--source");
  const dirIdx = args.indexOf("--source-dir");
  
  (async () => {
    if (sourceIdx >= 0) {
      const src = args[sourceIdx + 1];
      try {
        const stats = src.startsWith("http")
          ? await importFromUrl(src)
          : await importFromFile(src);
        console.log(`✅ 完成: 新增 ${stats.added} / 跳过 ${stats.skipped} / 错误 ${stats.errors.length}`);
        for (const e of stats.errors) console.log(`   ⚠️  ${e}`);
      } catch (err: any) {
        console.error(`❌ ${err.message}`);
      }
    }
    
    if (dirIdx >= 0) {
      const dir = args[dirIdx + 1];
      const files = readdirSync(dir).filter(f => f.endsWith(".json"));
      for (const file of files) {
        try {
          const stats = await importFromFile(join(dir, file));
          console.log(`   ${basename(file)}: +${stats.added} / ~${stats.skipped}`);
        } catch (err: any) {
          console.log(`   ${basename(file)}: ❌ ${err.message}`);
        }
      }
    }
    
    const final = loadBank<StandardQuestion>(join(QUIZ_DIR, "questions.json"));
    console.log(`\n📊 最终题库: ${final.questions.length} 题`);
  })();
}
