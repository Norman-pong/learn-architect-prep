import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CloudUploadOutlined,
  UploadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from "@/components/ui/icons";
import { useImport, useImportPreview } from "../api";
import { previewLabels } from "../types";
import type { ImportPreview } from "../types";

const alertBase = "flex items-start gap-3 rounded-lg border p-4 text-sm";

function Alert({
  variant,
  children,
}: {
  variant: "error" | "info" | "success" | "warning";
  children: React.ReactNode;
}) {
  const variants = {
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    info: "border-primary/30 bg-primary/10 text-primary",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  };

  return <div className={`${alertBase} ${variants[variant]}`}>{children}</div>;
}

export function ImportSection() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewMutation = useImportPreview();
  const importMutation = useImport();

  const totalPreview = preview ? Object.values(preview).reduce((sum, count) => sum + count, 0) : 0;

  const handleFile = useCallback(
    async (selected: File) => {
      setFile(selected);
      setPreview(null);
      setResult(null);
      setParseError(null);
      previewMutation.mutate(selected, {
        onSuccess: (data) => setPreview(data),
        onError: (error) => setParseError(error.message),
      });
    },
    [previewMutation],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped && dropped.type === "application/json") {
        handleFile(dropped);
      } else {
        setParseError("请上传 JSON 格式的备份文件");
      }
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleImport = () => {
    if (!file) return;
    importMutation.mutate(file, {
      onSuccess: (data) => {
        setResult(data);
        setPreview(null);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      },
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CloudUploadOutlined className="size-5 text-primary" />
          导入恢复
        </CardTitle>
        <CardDescription>
          选择之前导出的 JSON 备份文件进行恢复。导入时会根据 ID 自动合并或更新现有数据。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
            }
          `}
        >
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-background shadow-sm">
            <FileTextOutlined className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">
            {file ? file.name : "拖拽 JSON 文件到此处，或点击选择文件"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            仅支持 .json 格式，文件大小建议不超过 50 MB
          </p>
        </div>

        {parseError && (
          <Alert variant="error">
            <WarningOutlined className="mt-0.5 size-4 shrink-0" />
            <span>{parseError}</span>
          </Alert>
        )}

        {previewMutation.isPending && (
          <Alert variant="info">
            <span className="animate-pulse">正在解析备份文件…</span>
          </Alert>
        )}

        {preview && !result && (
          <div className="space-y-4">
            <Alert variant="info">
              <CheckCircleOutlined className="mt-0.5 size-4 shrink-0" />
              <span>备份文件解析成功，共 {totalPreview} 条记录</span>
            </Alert>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-medium">数据预览</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>数据类型</TableHead>
                    <TableHead className="text-right">记录数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Object.entries(preview) as [keyof ImportPreview, number][]).map(
                    ([key, count]) => (
                      <TableRow key={key}>
                        <TableCell>{previewLabels[key]}</TableCell>
                        <TableCell className="text-right font-mono">{count}</TableCell>
                      </TableRow>
                    ),
                  )}
                  <TableRow className="font-semibold">
                    <TableCell>合计</TableCell>
                    <TableCell className="text-right font-mono">{totalPreview}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                <UploadOutlined className="size-4" />
                {importMutation.isPending ? "导入中…" : "确认导入"}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <Alert variant={result.errors.length > 0 ? "warning" : "success"}>
            <div className="flex-1">
              <p className="font-medium">导入完成：{result.imported} 条记录已恢复</p>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">部分记录导入失败：</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 10 && <li>…还有 {result.errors.length - 10} 条错误</li>}
                  </ul>
                </div>
              )}
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
