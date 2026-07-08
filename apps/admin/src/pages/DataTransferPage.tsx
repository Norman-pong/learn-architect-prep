import { useState, useRef } from "react";
import { Button, Card, message, Space, Typography, Upload, Alert, Spin } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { fetchWithAuth } from "../api/client";

const { Title, Text } = Typography;

interface ImportPreview {
  reviewCards: number;
  quizRecords: number;
  examRecords: number;
  writings: number;
  notes: number;
  studySessions: number;
  aiConfigs: number;
  aiUsage: number;
}

export default function DataTransferPage() {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(
    null,
  );
  const fileRef = useRef<File | null>(null);

  const handleExport = async () => {
    try {
      const res = await fetchWithAuth("/api/data/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "导出失败" }));
        message.error(data.message || "导出失败");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename =
        res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? "backup.json";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success("导出成功");
    } catch {
      message.error("导出失败");
    }
  };

  const handleFileChange = (file: File) => {
    fileRef.current = file;
    setPreviewError(null);
    setPreview(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data || typeof data !== "object" || !data.userId) {
          setPreviewError("无效的备份文件格式");
          return;
        }
        setPreview({
          reviewCards: Array.isArray(data.reviewCards) ? data.reviewCards.length : 0,
          quizRecords: Array.isArray(data.quizRecords) ? data.quizRecords.length : 0,
          examRecords: Array.isArray(data.examRecords) ? data.examRecords.length : 0,
          writings: Array.isArray(data.writings) ? data.writings.length : 0,
          notes: Array.isArray(data.notes) ? data.notes.length : 0,
          studySessions: Array.isArray(data.studySessions) ? data.studySessions.length : 0,
          aiConfigs: Array.isArray(data.aiConfigs) ? data.aiConfigs.length : 0,
          aiUsage: Array.isArray(data.aiUsage) ? data.aiUsage.length : 0,
        });
      } catch {
        setPreviewError("无法解析 JSON 文件");
      }
    };
    reader.readAsText(file);
    return false; // prevent default upload
  };

  const handleImport = async () => {
    if (!fileRef.current) {
      message.warning("请先选择备份文件");
      return;
    }
    setImporting(true);
    try {
      const text = await fileRef.current.text();
      const jsonData = JSON.parse(text);
      const res = await fetchWithAuth("/api/data/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(jsonData),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        message.error(data.message || "导入失败");
        return;
      }
      setImportResult({ imported: data.imported, errors: data.errors || [] });
      message.success(`导入成功，共 ${data.imported} 条记录`);
    } catch {
      message.error("导入失败");
    } finally {
      setImporting(false);
    }
  };

  const totalPreview = preview
    ? preview.reviewCards +
      preview.quizRecords +
      preview.examRecords +
      preview.writings +
      preview.notes +
      preview.studySessions +
      preview.aiConfigs +
      preview.aiUsage
    : 0;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>数据备份与恢复</Title>

      <Card title="导出备份" style={{ marginBottom: 24 }}>
        <Space direction="vertical">
          <Text>
            将您的学习数据导出为 JSON 文件，包含复习卡片、练习记录、模拟考记录、论文、笔记等。
          </Text>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出备份
          </Button>
        </Space>
      </Card>

      <Card title="导入恢复" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>
            选择之前导出的 JSON 备份文件进行恢复。导入时会根据 ID 自动合并或更新现有数据。
          </Text>
          <Upload
            beforeUpload={(file) => {
              handleFileChange(file);
              return false;
            }}
            accept=".json"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择备份文件</Button>
          </Upload>

          {previewError && <Alert type="error" message={previewError} />}

          {preview && (
            <div>
              <Alert type="info" message={`备份文件解析成功，共 ${totalPreview} 条记录`} />
              <div style={{ marginTop: 12, padding: 12, background: "#f5f5f5", borderRadius: 4 }}>
                <Text strong>数据预览：</Text>
                <ul style={{ marginTop: 8 }}>
                  <li>复习卡片：{preview.reviewCards} 条</li>
                  <li>练习记录：{preview.quizRecords} 条</li>
                  <li>模拟考记录：{preview.examRecords} 条</li>
                  <li>论文：{preview.writings} 篇</li>
                  <li>笔记：{preview.notes} 条</li>
                  <li>学习会话：{preview.studySessions} 条</li>
                  <li>AI 配置：{preview.aiConfigs} 条</li>
                  <li>AI 使用记录：{preview.aiUsage} 条</li>
                </ul>
              </div>
              <Button
                type="primary"
                onClick={handleImport}
                loading={importing}
                style={{ marginTop: 12 }}
              >
                确认导入
              </Button>
            </div>
          )}

          {importResult && (
            <div style={{ marginTop: 12 }}>
              <Alert
                type={importResult.errors.length > 0 ? "warning" : "success"}
                message={`导入完成：${importResult.imported} 条记录已恢复`}
                description={
                  importResult.errors.length > 0 ? (
                    <div>
                      <Text type="warning">部分记录导入失败：</Text>
                      <ul>
                        {importResult.errors.slice(0, 10).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 10 && (
                          <li>...还有 {importResult.errors.length - 10} 条错误</li>
                        )}
                      </ul>
                    </div>
                  ) : undefined
                }
              />
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
}
