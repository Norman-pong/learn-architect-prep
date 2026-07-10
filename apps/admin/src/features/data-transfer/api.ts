import { useMutation } from "@tanstack/react-query";
import { api, getAuthToken, getEdenError } from "@/lib/api";
import { toast } from "sonner";
import type { ImportPreview } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export interface ImportResult {
  imported: number;
  errors: string[];
}

export function useExport() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE || "http://localhost:8787"}/api/data/export`,
        {
          headers: getAuthToken() ? { authorization: `Bearer ${getAuthToken()}` } : {},
        },
      );

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const message =
          isRecord(data) && typeof data.error === "string"
            ? data.error
            : `导出失败 (${response.status})`;
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename =
        response.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? "backup.json";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("导出成功"),
    onError: (error) => toast.error(error.message || "导出失败"),
  });
}

export function useImportPreview() {
  return useMutation<ImportPreview, Error, File>({
    mutationFn: async (file) => {
      const text = await file.text();
      const data: unknown = JSON.parse(text);

      if (!isRecord(data) || typeof data.userId !== "string") {
        throw new Error("无效的备份文件格式");
      }

      return {
        reviewCards: Array.isArray(data.reviewCards) ? data.reviewCards.length : 0,
        quizRecords: Array.isArray(data.quizRecords) ? data.quizRecords.length : 0,
        examRecords: Array.isArray(data.examRecords) ? data.examRecords.length : 0,
        writings: Array.isArray(data.writings) ? data.writings.length : 0,
        notes: Array.isArray(data.notes) ? data.notes.length : 0,
        studySessions: Array.isArray(data.studySessions) ? data.studySessions.length : 0,
        aiConfigs: Array.isArray(data.aiConfigs) ? data.aiConfigs.length : 0,
        aiUsage: Array.isArray(data.aiUsage) ? data.aiUsage.length : 0,
      };
    },
    onError: (error) => toast.error(error.message || "无法解析备份文件"),
  });
}

export function useImport() {
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file) => {
      const text = await file.text();
      const data: unknown = JSON.parse(text);

      if (!isRecord(data) || typeof data.userId !== "string") {
        throw new Error("无效的备份文件格式");
      }

      const { data: result, error } = await api.api.data.import.post(data);
      if (error) throw new Error(getEdenError(error, "导入失败"));
      const importResult = result as { status: string; imported: number; errors: string[] };
      return { imported: importResult.imported, errors: importResult.errors };
    },
    onSuccess: (result) => {
      toast.success(`导入成功，共 ${result.imported} 条记录`);
    },
    onError: (error) => toast.error(error.message || "导入失败"),
  });
}
