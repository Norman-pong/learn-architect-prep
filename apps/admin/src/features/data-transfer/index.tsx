import { ExportSection } from "./components/export-section";
import { ImportSection } from "./components/import-section";

export function DataTransferPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">数据备份与恢复</h1>
        <p className="text-sm text-muted-foreground">
          导出或导入您的学习数据，确保数据安全与迁移。
        </p>
      </div>
      <ExportSection />
      <ImportSection />
    </div>
  );
}
