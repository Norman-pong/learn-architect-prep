import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getEdenError } from "@/lib/api";
import type { Writing, WritingSummary, WritingUpsertBody } from "@archprep/shared";
import type {
  Template,
  TemplateDetail,
  Sample,
  WritingTip,
  YearTopics,
  MasterProjects,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function throwIfError(data: unknown): void {
  if (isRecord(data) && data.status === "error" && typeof data.message === "string") {
    throw new Error(data.message);
  }
}

function extractOkData<T>(data: unknown, fallback: string): T {
  throwIfError(data);
  if (!isRecord(data) || data.status !== "ok") throw new Error(fallback);
  const result = data.data as T; // server returns { status: "ok", data: T }
  return result;
}

async function readResponseText(data: unknown): Promise<string> {
  if (data instanceof Response) {
    return data.text();
  }
  return typeof data === "string" ? data : "";
}

export function useWritings() {
  return useQuery({
    queryKey: ["writings"],
    queryFn: async () => {
      const { data, error } = await api.api.writings.get();
      if (error) throw new Error(getEdenError(error, "获取论文列表失败"));
      return extractOkData<WritingSummary[]>(data, "获取论文列表失败");
    },
  });
}

export function useWriting(id: string | null) {
  return useQuery({
    queryKey: ["writings", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await api.api.writings({ id }).get();
      if (error) throw new Error(getEdenError(error, "获取论文失败"));
      return extractOkData<Writing>(data, "获取论文失败") ?? null;
    },
    enabled: Boolean(id),
  });
}

export function useSaveWriting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: WritingUpsertBody) => {
      const { data, error } = await api.api.writings.post({
        id: body.id,
        title: body.title,
        sections: body.sections,
      });
      if (error) throw new Error(getEdenError(error, "保存失败"));
      return extractOkData<Writing>(data, "保存失败");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["writings"] });
    },
    onError: (err) => {
      toast.error(err.message || "保存失败");
    },
  });
}

export function useDeleteWriting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.api.writings({ id }).delete();
      if (error) throw new Error(getEdenError(error, "删除失败"));
      throwIfError(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["writings"] });
      toast.success("已删除");
    },
    onError: (err) => {
      toast.error(err.message || "删除失败");
    },
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await api.api.templates.get();
      if (error) throw new Error(getEdenError(error, "获取模板失败"));
      const text = await readResponseText(data);
      const parsed = JSON.parse(text);
      const list = parsed as { templates: Template[] }; // server serves index.json as string
      return list.templates ?? [];
    },
  });
}

export function useTemplate(slug: string | null) {
  return useQuery({
    queryKey: ["templates", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await api.api.templates({ slug }).get();
      if (error) throw new Error(getEdenError(error, "获取模板内容失败"));
      const text = await readResponseText(data);
      return parseTemplateMarkdown(text);
    },
    enabled: Boolean(slug),
  });
}

export function useSamples() {
  return useQuery({
    queryKey: ["samples"],
    queryFn: async () => {
      const { data, error } = await api.api.samples.get();
      if (error) throw new Error(getEdenError(error, "获取范文失败"));
      const text = await readResponseText(data);
      const parsed = JSON.parse(text);
      const samples = parsed as Sample[]; // server serves index.json as string
      return samples ?? [];
    },
  });
}

export function useSample(slug: string | null) {
  return useQuery({
    queryKey: ["samples", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await api.api.samples({ slug }).get();
      if (error) throw new Error(getEdenError(error, "获取范文内容失败"));
      const text = await readResponseText(data);
      return text ?? "";
    },
    enabled: Boolean(slug),
  });
}

export function useWritingTips() {
  return useQuery({
    queryKey: ["writing-tips"],
    queryFn: async () => {
      const { data, error } = await api.api["writing-tips"].get();
      if (error) throw new Error(getEdenError(error, "获取写作技巧失败"));
      const tip = data as WritingTip; // server returns plain JSON
      return tip ?? null;
    },
  });
}

export function useWritingTipTopics() {
  return useQuery({
    queryKey: ["writing-tips", "topics"],
    queryFn: async () => {
      const { data, error } = await api.api["writing-tips"].topics.get();
      if (error) throw new Error(getEdenError(error, "获取历年题目失败"));
      const topics = data as YearTopics; // server returns plain JSON
      return topics ?? null;
    },
  });
}

export function useWritingTipProjects() {
  return useQuery({
    queryKey: ["writing-tips", "projects"],
    queryFn: async () => {
      const { data, error } = await api.api["writing-tips"].projects.get();
      if (error) throw new Error(getEdenError(error, "获取母版项目失败"));
      const projects = data as MasterProjects; // server returns plain JSON
      return projects ?? null;
    },
  });
}

function parseTemplateMarkdown(text: string): TemplateDetail {
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return parseSimpleMarkdown(text);
  }

  const yaml = frontmatterMatch[1];
  const content = text.slice(frontmatterMatch[0].length);
  const data = parseTemplateYaml(yaml);

  return {
    title: data.title ?? "",
    sections: (data.sections ?? []).map((section, index) => ({
      id: String(section.id ?? `section-${index}`),
      name: String(section.name ?? ""),
      word_count: {
        min: Number((section.word_count as Record<string, unknown> | undefined)?.min ?? 0),
        max: Number((section.word_count as Record<string, unknown> | undefined)?.max ?? 0),
      },
      weight: String(section.weight ?? ""),
    })),
    word_count: {
      total: {
        min: Number(data.word_count?.total?.min ?? 0),
        max: Number(data.word_count?.total?.max ?? 0),
      },
    },
    content,
  };
}

function parseTemplateYaml(yaml: string): {
  title?: string;
  sections?: Array<Record<string, unknown>>;
  word_count?: { total?: { min?: number; max?: number } };
} {
  const lines = yaml.split("\n").map((line) => line.replace(/\r$/, ""));
  let i = 0;

  function parseObject(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    const baseIndent = lines[i]?.match(/^(\s*)/)?.[1].length ?? 0;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      if (indent < baseIndent) break;
      if (indent > baseIndent) {
        i++;
        continue;
      }

      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) {
        i++;
        continue;
      }

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (value) {
        obj[key] = parseYamlValue(value);
        i++;
      } else {
        i++;
        const nextLine = lines[i];
        if (nextLine?.trim().startsWith("-")) {
          obj[key] = parseArray();
        } else {
          obj[key] = parseObject();
        }
      }
    }

    return obj;
  }

  function parseArray(): Array<Record<string, unknown>> {
    const arr: Array<Record<string, unknown>> = [];
    const baseIndent = lines[i]?.match(/^(\s*)/)?.[1].length ?? 0;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      if (indent < baseIndent) break;

      const itemMatch = line.match(/^(\s*)-\s+(\w+):\s*(.*)$/);
      if (!itemMatch) break;

      const [, , firstKey, firstValue] = itemMatch;
      const item: Record<string, unknown> = { [firstKey]: parseYamlValue(firstValue) };
      i++;
      arr.push(item);

      while (i < lines.length) {
        const nestedLine = lines[i];
        if (!nestedLine.trim()) {
          i++;
          continue;
        }
        const nestedIndent = nestedLine.match(/^(\s*)/)?.[1].length ?? 0;
        if (nestedIndent <= baseIndent) break;

        const colonIndex = nestedLine.indexOf(":");
        if (colonIndex === -1) {
          i++;
          continue;
        }

        const key = nestedLine.slice(0, colonIndex).trim();
        const value = nestedLine.slice(colonIndex + 1).trim();
        if (value) {
          item[key] = parseYamlValue(value);
          i++;
        } else {
          i++;
          const nextLine = lines[i];
          if (nextLine?.trim().startsWith("-")) {
            item[key] = parseArray();
          } else {
            item[key] = parseObject();
          }
        }
      }
    }

    return arr;
  }

  const result = parseObject();
  return {
    title: result.title as string | undefined,
    sections: result.sections as Array<Record<string, unknown>> | undefined,
    word_count: result.word_count as { total?: { min?: number; max?: number } } | undefined,
  };
}

function parseYamlValue(value: string): unknown {
  value = value.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  return value;
}

function parseSimpleMarkdown(text: string): TemplateDetail {
  const lines = text.split("\n");
  const title = lines[0].replace(/^#\s*/, "").trim();
  const sections: TemplateDetail["sections"] = [];
  let currentSection: { heading: string; content: string[] } | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      if (currentSection) {
        sections.push({
          id: `section-${sections.length}`,
          name: currentSection.heading,
          word_count: { min: 0, max: 0 },
          weight: "",
        });
      }
      currentSection = { heading: line.replace(/^##\s*/, "").trim(), content: [] };
    } else if (currentSection) {
      currentSection.content.push(line);
    }
  }

  if (currentSection) {
    sections.push({
      id: `section-${sections.length}`,
      name: currentSection.heading,
      word_count: { min: 0, max: 0 },
      weight: "",
    });
  }

  return {
    title,
    sections,
    word_count: { total: { min: 0, max: 0 } },
    content: text,
  };
}
