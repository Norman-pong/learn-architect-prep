import { readFile } from "node:fs/promises";
import path from "node:path";

const KNOWLEDGE_DIR = path.resolve(import.meta.dir, "../../../data/knowledge");

export interface SearchResult {
  kpId: string;
  title: string;
  chapterId: string;
  chapterName: string;
  snippet: string;
  highlights: string[];
  relevance: number;
}

interface ChapterIndex {
  id: string;
  title: string;
  knowledgePoints: { id: string; title: string; file: string }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Escape a string for safe inclusion in a RegExp.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildHighlightPattern(terms: string[]): RegExp | null {
  if (terms.length === 0) return null;
  const source = terms.map(escapeRegExp).join("|");
  return new RegExp(`(${source})`, "giu");
}

function extractSnippet(
  text: string,
  pattern: RegExp,
  maxLength = 200,
): { snippet: string; highlights: string[] } {
  const match = pattern.exec(text);
  const startIndex = match ? match.index : 0;
  const half = Math.floor(maxLength / 2);
  let snippetStart = Math.max(0, startIndex - half);
  let snippetEnd = Math.min(text.length, snippetStart + maxLength);
  if (snippetEnd === text.length) {
    snippetStart = Math.max(0, snippetEnd - maxLength);
  }
  const snippet = text.slice(snippetStart, snippetEnd).trim();
  const normalized = snippet.replace(/\s+/g, " ");
  const highlights = Array.from(new Set(normalized.match(pattern) ?? []));
  return { snippet: snippetStart > 0 ? `…${normalized}` : normalized, highlights };
}

function scoreResult(
  text: string,
  title: string,
  terms: string[],
  titleMatches: number,
  bodyMatches: number,
): number {
  // Title matches are weighted much more heavily than body matches.
  const titleScore = titleMatches * 10;
  const bodyScore = bodyMatches * 1;
  // Exact phrase matches in the full text get a bonus.
  const phraseText = text.replace(/\s+/g, " ");
  const exactPhraseBonus = terms.length > 1 && terms.every((t) => phraseText.includes(t)) ? 5 : 0;
  return titleScore + bodyScore + exactPhraseBonus;
}

async function loadChapterIndex(dir: string): Promise<ChapterIndex | null> {
  const indexPath = path.join(KNOWLEDGE_DIR, dir, "index.json");
  const file = Bun.file(indexPath);
  if (!(await file.exists())) return null;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    if (!isRecord(parsed)) return null;
    if (typeof parsed.id !== "string" || typeof parsed.title !== "string") return null;
    const rawKps = parsed.knowledgePoints;
    if (!Array.isArray(rawKps)) return null;
    const knowledgePoints = rawKps.filter(isRecord).map((kp) => ({
      id: typeof kp.id === "string" ? kp.id : "",
      title: typeof kp.title === "string" ? kp.title : "",
      file: typeof kp.file === "string" ? kp.file : "",
    }));
    return { id: parsed.id, title: parsed.title, knowledgePoints };
  } catch {
    return null;
  }
}

export async function searchKnowledge(query: string): Promise<SearchResult[]> {
  const raw = query.trim();
  if (!raw) return [];
  const terms = Array.from(new Set(raw.split(/\s+/).filter((t) => t.length > 0)));
  if (terms.length === 0) return [];

  const pattern = buildHighlightPattern(terms);
  if (!pattern) return [];

  const chapterDirs = await readFile(path.join(KNOWLEDGE_DIR, "index.json"), "utf-8")
    .then((text) => {
      const parsed: unknown = JSON.parse(text);
      if (!isRecord(parsed)) return [];
      const rawChapters = parsed.chapters;
      if (!Array.isArray(rawChapters)) return [];
      return rawChapters.filter(isRecord).map((ch) => ({
        id: typeof ch.id === "string" ? ch.id : "",
        name: typeof ch.title === "string" ? ch.title : "",
        dir: `chapter-${(typeof ch.id === "string" ? ch.id : "").replace(/^ch/, "").padStart(2, "0")}`,
      }));
    })
    .catch(() => []);

  const results: SearchResult[] = [];

  for (const chapter of chapterDirs) {
    const index = await loadChapterIndex(chapter.dir);
    if (!index) continue;

    for (const kp of index.knowledgePoints ?? []) {
      const filePath = path.join(KNOWLEDGE_DIR, chapter.dir, path.basename(kp.file));
      const file = Bun.file(filePath);
      if (!(await file.exists())) continue;
      const content = await file.text();
      const plainText = content.replace(/[#*[\]()`-]/g, " ");
      const titleLower = kp.title.toLowerCase();

      const titleMatches = terms.reduce((sum, term) => {
        const count = (titleLower.match(new RegExp(escapeRegExp(term), "gi")) ?? []).length;
        return sum + count;
      }, 0);
      const bodyMatches = terms.reduce((sum, term) => {
        const count = (
          plainText.toLowerCase().match(new RegExp(escapeRegExp(term.toLowerCase()), "gi")) ?? []
        ).length;
        return sum + count;
      }, 0);

      if (titleMatches === 0 && bodyMatches === 0) continue;

      const { snippet, highlights } = extractSnippet(plainText, pattern);
      const relevance = scoreResult(plainText, kp.title, terms, titleMatches, bodyMatches);
      results.push({
        kpId: kp.id,
        title: kp.title,
        chapterId: chapter.id,
        chapterName: chapter.name,
        snippet,
        highlights,
        relevance,
      });
    }
  }

  return results.toSorted((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
}
