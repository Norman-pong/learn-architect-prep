import { SectionPageLayout } from "@/components/layout";
import { ExportSection } from "./components/export-section";
import { ImportSection } from "./components/import-section";

export function DataTransferPage() {
  return (
    <SectionPageLayout title="数据备份与恢复" description="导入导出学习数据">
      <ExportSection />
      <ImportSection />
    </SectionPageLayout>
  );
}
