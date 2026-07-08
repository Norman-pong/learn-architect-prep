import { importQuestionsFromUrl, readQuestionBank } from "./import-quiz";

/**
 * 题库数据源配置。
 * 已知的系统架构设计师真题/模拟题源仓库。
 */
const SOURCES = [
  {
    name: "system_architect (gitee镜像)",
    url: "https://gitee.com/xxlllq/system_architect/raw/master/软考系统架构师历年真题/综合知识/2009-2025.json",
    note: "xxlllq/system_architect 仓库，含 2009-2025 真题，GitHub 可能被墙改用 gitee",
  },
  // GitHub raw URLs — 可能因为网络原因失败，用 gitee 镜像备选
  {
    name: "system_architect GitHub",
    url: "https://raw.githubusercontent.com/xxlllq/system_architect/main/题库/综合知识.json",
    note: "GitHub 真题仓库，格式与 PRD §6.3 不同，需要转换脚本处理",
  },
];

interface BulkResult {
  source: string;
  added: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * 从多个源批量导入题库
 */
async function bulkImport(): Promise<BulkResult[]> {
  console.log(`📚 当前题库：${(await readQuestionBank()).questions.length} 题\n`);
  const results: BulkResult[] = [];

  for (const src of SOURCES) {
    console.log(`🔄 拉取: ${src.name} (${src.url})`);
    try {
      const r = await importQuestionsFromUrl(src.url);
      console.log(`   新增 ${r.added} / 跳过 ${r.skipped} / 失败 ${r.failed}`);
      results.push({ source: src.name, ...r });
    } catch (err: any) {
      console.log(`   ❌ 失败: ${err.message}`);
      results.push({ source: src.name, added: 0, skipped: 0, failed: 0, errors: [err.message] });
    }
  }

  const final = await readQuestionBank();
  console.log(`\n✅ 最终题库：${final.questions.length} 题`);
  return results;
}

void bulkImport();
