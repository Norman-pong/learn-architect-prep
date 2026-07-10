import { SectionPageLayout } from "@/components/layout";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplates, useTemplate } from "./api";
import { TemplateCard } from "./components/template-card";

export function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: detail, isLoading: detailLoading } = useTemplate(expandedId);

  return (
    <SectionPageLayout title="论文模板" description="结构化论文模板">
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无模板数据</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              detail={expandedId === t.id ? (detail ?? null) : null}
              loading={expandedId === t.id && detailLoading}
              onLoad={(id) => setExpandedId((prev) => (prev === id ? null : id))}
            />
          ))}
        </div>
      )}
    </SectionPageLayout>
  );
}

export default TemplatesPage;
