import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTextOutlined } from "@/components/ui/icons";
import { useTemplates, useTemplate } from "./api";
import { TemplateCard } from "./components/template-card";

export function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: detail, isLoading: detailLoading } = useTemplate(expandedId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FileTextOutlined className="h-6 w-6 text-primary" />
          论文模板库
        </h1>
        <p className="text-muted-foreground">
          选择适合论文主题的模板，点击卡片展开查看结构与填写引导。
        </p>
      </div>

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
    </div>
  );
}

export default TemplatesPage;
