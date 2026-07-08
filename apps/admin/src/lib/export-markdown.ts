import {
  THESIS_SECTIONS,
  THESIS_SECTION_TARGETS,
  type ThesisSectionKey,
  type ThesisSections,
} from "@archprep/shared";
import { countWords } from "./word-count";

/**
 * Build a downloadable Markdown string for one thesis draft.
 *
 * Layout (matches 调研报告 §4.3 template):
 *   # <title>
 *   ## 摘要
 *   <body>
 *   ## 项目背景与挑战
 *   ...
 *
 * Each section is included even when empty so the export never silently
 * drops a part of the paper. Empty sections render the placeholder text
 * `_（待补充）_`.
 */
export function buildMarkdown(title: string, sections: ThesisSections): string {
  const safeTitle = title.trim() || "未命名论文";
  const lines: string[] = [`# ${safeTitle}`, ""];

  for (const key of THESIS_SECTIONS) {
    const label = THESIS_SECTION_TARGETS[key as ThesisSectionKey].label;
    const body = sections[key]?.trim();
    lines.push(`## ${label}`, "");
    lines.push(body && body.length > 0 ? body : "_（待补充）_");
    lines.push("");
  }

  return lines.join("\n");
}

/** Trigger a browser download for the given Markdown content. */
export function downloadMarkdown(filename: string, content: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Convenience: build markdown + download in one call. */
export function exportThesisAsMarkdown(
  title: string,
  sections: ThesisSections,
): { filename: string; content: string; totalWords: number } {
  const safeTitle = title.trim() || "未命名论文";
  const content = buildMarkdown(safeTitle, sections);
  const filename = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`;
  downloadMarkdown(filename, content);
  const totalWords = Object.values(sections).reduce((sum, v) => sum + countWords(v), 0);
  return { filename, content, totalWords };
}
