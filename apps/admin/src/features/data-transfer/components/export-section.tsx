import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadOutlined, CloudDownloadOutlined } from "@/components/ui/icons";
import { useExport } from "../api";

export function ExportSection() {
  const exportMutation = useExport();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CloudDownloadOutlined className="size-5 text-primary" />
          导出备份
        </CardTitle>
        <CardDescription>
          将您的学习数据导出为 JSON 文件，包含复习卡片、练习记录、模拟考记录、论文、笔记等。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            备份文件可用于数据迁移或本地存档，导出内容仅包含您当前账户的数据。
          </p>
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="shrink-0"
          >
            <DownloadOutlined className="size-4" />
            {exportMutation.isPending ? "导出中…" : "导出备份"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
