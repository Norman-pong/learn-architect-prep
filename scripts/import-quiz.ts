import path from "node:path";

const QUIZ_DIR = path.resolve(import.meta.dir, "../data/quiz");
const QUESTIONS_FILE = path.join(QUIZ_DIR, "questions.json");

export interface ChoiceQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation?: string;
  chapter?: string;
  difficulty?: "easy" | "medium" | "hard";
  source?: string;
  hash?: string;
  year?: number | null;
}

export interface QuestionsFile {
  version: number;
  updatedAt: string;
  questions: ChoiceQuestion[];
}

export function assertQuestionsFile(value: unknown): asserts value is QuestionsFile {
  if (typeof value !== "object" || value === null) {
    throw new Error("题库文件不是合法的 JSON 对象");
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.questions)) {
    throw new Error("题库文件缺少 questions 数组");
  }
}

export interface ImportResult {
  added: number;
  skipped: number;
  failed: number;
  errors: { item: unknown; reason: string }[];
}

/**
 * 读取本地 questions.json。若文件不存在则返回空题库。
 */
export async function readQuestionBank(): Promise<QuestionsFile> {
  const file = Bun.file(QUESTIONS_FILE);
  if (!(await file.exists())) {
    return { version: 1, updatedAt: new Date().toISOString(), questions: [] };
  }
  try {
    const data = JSON.parse(await file.text()) as unknown;
    assertQuestionsFile(data);
    return data as QuestionsFile;
  } catch (err) {
    throw new Error(
      `读取 questions.json 失败: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
}

/**
 * 校验单道选择题是否符合 PRD §6.3 Schema。
 */
export function validateChoiceQuestion(item: unknown): ChoiceQuestion {
  if (typeof item !== "object" || item === null) {
    throw new Error("题目不是对象");
  }
  const q = item as Record<string, unknown>;

  if (typeof q.question !== "string" || q.question.trim().length === 0) {
    throw new Error("缺少题目题干 question");
  }
  if (typeof q.options !== "object" || q.options === null || Array.isArray(q.options)) {
    throw new Error("options 必须是对象");
  }
  const options = q.options as Record<string, unknown>;
  const optionKeys = ["A", "B", "C", "D"];
  for (const key of optionKeys) {
    if (typeof options[key] !== "string" || options[key] === "") {
      throw new Error(`选项 ${key} 缺失或为空`);
    }
  }
  if (typeof q.answer !== "string" || !optionKeys.includes(q.answer)) {
    throw new Error("answer 必须是 A/B/C/D 之一");
  }

  return {
    id: typeof q.id === "string" ? q.id : generateId(),
    question: q.question.trim(),
    options: optionKeys.reduce(
      (acc, key) => {
        acc[key] = String(options[key]).trim();
        return acc;
      },
      {} as Record<string, string>,
    ),
    answer: q.answer,
    explanation: typeof q.explanation === "string" ? q.explanation : undefined,
    chapter: typeof q.chapter === "string" && q.chapter.length > 0 ? q.chapter : "1",
    difficulty: normalizeDifficulty(q.difficulty),
    source: typeof q.source === "string" && q.source.length > 0 ? q.source : "远程拉取",
    hash: typeof q.hash === "string" && q.hash.length > 0 ? q.hash : undefined,
    year: typeof q.year === "number" ? q.year : null,
  };
}

function normalizeDifficulty(value: unknown): "easy" | "medium" | "hard" {
  if (typeof value === "string" && ["easy", "medium", "hard"].includes(value)) {
    return value as "easy" | "medium" | "hard";
  }
  return "medium";
}

function generateId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sha256(input: string): string {
  const buffer = new TextEncoder().encode(input);
  return Bun.hash(buffer).toString(16).padStart(64, "0");
}

export function computeQuestionHash(q: ChoiceQuestion): string {
  const sortedKeys = Object.keys(q.options).sort();
  const sortedOptions = sortedKeys.reduce(
    (acc, key) => {
      acc[key] = q.options[key];
      return acc;
    },
    {} as Record<string, string>,
  );
  const payload = `${q.question}:${JSON.stringify(sortedOptions, undefined, undefined)}:${q.answer}`;
  return sha256(payload);
}

export interface ImportOptions {
  sourceName?: string;
  year?: number;
}

/**
 * 将外部题目数组导入本地 questions.json，按 SHA-256 去重。
 */
export async function importQuestions(
  rawItems: unknown[],
  options: ImportOptions = {},
): Promise<ImportResult> {
  const bank = await readQuestionBank();
  const existingHashes = new Set(bank.questions.map((q) => q.hash).filter(Boolean));
  const existingIds = new Set(bank.questions.map((q) => q.id));

  const result: ImportResult = { added: 0, skipped: 0, failed: 0, errors: [] };

  for (const raw of rawItems) {
    try {
      const validated = validateChoiceQuestion(raw);
      if (!validated.hash) {
        validated.hash = computeQuestionHash(validated);
      }
      if (existingHashes.has(validated.hash)) {
        result.skipped += 1;
        continue;
      }
      if (!validated.id || existingIds.has(validated.id)) {
        validated.id = `q-${Date.now()}-${result.added}-${Math.random().toString(36).slice(2, 8)}`;
      }
      if (options.sourceName) {
        validated.source = options.sourceName;
      }
      if (options.year) {
        validated.year = options.year;
      }
      bank.questions.push(validated);
      existingHashes.add(validated.hash);
      existingIds.add(validated.id);
      result.added += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({
        item: raw,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  bank.updatedAt = new Date().toISOString();
  await Bun.write(QUESTIONS_FILE, JSON.stringify(bank, null, 2));
  return result;
}

/**
 * 从 URL 拉取题库并导入。Bun 的 fetch 在服务端可直接使用。
 */
export async function importQuestionsFromUrl(url: string): Promise<ImportResult> {
  let res: Response;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (err) {
    throw new Error(`拉取 ${url} 失败: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }
  if (!res.ok) {
    throw new Error(`拉取 ${url} 失败: HTTP ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  let items: unknown[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as Record<string, unknown>).questions)
  ) {
    items = (data as Record<string, unknown>).questions as unknown[];
  } else {
    throw new Error("远程题库格式不正确：顶层必须是数组或 { questions: [] }");
  }

  const urlSource = new URL(url).hostname;
  const year = detectYearFromUrl(url);
  return importQuestions(items, { sourceName: urlSource, year });
}

function detectYearFromUrl(url: string): number | undefined {
  const match = url.match(/(20\d{2})/);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

/**
 * 命令行入口：
 *   bun scripts/import-quiz.ts data/import/xxx.json
 *   bun scripts/import-quiz.ts https://example.com/questions.json
 *   bun scripts/import-quiz.ts --url https://example.com/questions.json
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  let target: string | undefined;

  const urlFlag = args.indexOf("--url");
  if (urlFlag !== -1) {
    target = args[urlFlag + 1];
  } else if (args.length > 0 && !args[0].startsWith("--")) {
    target = args[0];
  }

  if (!target) {
    console.error("用法: bun scripts/import-quiz.ts <file-or-url> | --url <url>");
    process.exit(1);
  }

  try {
    let result: ImportResult;
    if (target.startsWith("http://") || target.startsWith("https://")) {
      result = await importQuestionsFromUrl(target);
    } else {
      const file = Bun.file(path.resolve(target));
      if (!(await file.exists())) {
        throw new Error(`文件不存在: ${target}`);
      }
      const items = JSON.parse(await file.text()) as unknown;
      if (!Array.isArray(items)) {
        throw new Error("导入文件顶层必须是题目数组");
      }
      result = await importQuestions(items, { sourceName: "本地导入" });
    }
    console.log(`导入完成: 新增 ${result.added}, 跳过 ${result.skipped}, 失败 ${result.failed}`);
    if (result.errors.length > 0) {
      console.error("失败项:");
      for (const e of result.errors.slice(0, 10)) {
        console.error(`  - ${e.reason}`);
      }
    }
  } catch (err) {
    console.error(`错误: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
