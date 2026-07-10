import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { Template, TemplateDetail } from "../types";

interface TemplateCardProps {
  template: Template;
  detail: TemplateDetail | null;
  loading: boolean;
  onLoad: (id: string) => void;
}

export function TemplateCard({ template, detail, loading, onLoad }: TemplateCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{template.title}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{template.sections.length} 节</Badge>
          <Badge variant="outline">
            {template.word_count.min}-{template.word_count.max} 字
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setExpanded((v) => !v);
            if (!expanded && !detail) onLoad(template.id);
          }}
        >
          {expanded ? "收起" : "预览模板内容"}
        </Button>

        {expanded && (
          <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
            {loading && !detail && <p className="text-sm text-muted-foreground">模板内容加载中…</p>}
            {detail && (
              <>
                <p className="font-medium">{detail.title}</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {detail.sections.map((s) => (
                    <li key={s.id}>
                      {s.name}（{s.word_count.min}-{s.word_count.max} 字，{s.weight}）
                    </li>
                  ))}
                </ul>
                <div className="max-h-80 overflow-auto rounded-md border border-border bg-card p-3">
                  <MarkdownRenderer content={detail.content} />
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
