import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { Guideline } from "../types";

interface TipsAccordionProps {
  guidelines: Guideline[];
}

export function TipsAccordion({ guidelines }: TipsAccordionProps) {
  const [open, setOpen] = useState<Set<string>>(new Set(["abstract"]));

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importanceColor: Record<Guideline["importance"], BadgeProps["variant"]> = {
    high: "destructive",
    medium: "default",
    low: "outline",
  };

  return (
    <div className="space-y-3">
      {guidelines.map((g) => {
        const isOpen = open.has(g.id);
        return (
          <Card key={g.id} className="overflow-hidden">
            <button
              onClick={() => toggle(g.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Badge variant={importanceColor[g.importance]}>{g.importance}</Badge>
                <span className="font-medium">{g.title}</span>
              </div>
              <span
                className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>
            {isOpen && (
              <CardContent className="border-t border-border bg-muted/20 px-4 pb-4 pt-4">
                <div className="space-y-4">
                  <MarkdownRenderer content={g.content} />

                  {g.template && (
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-sm">模板</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap break-words font-mono text-sm">
                          {g.template}
                        </pre>
                      </CardContent>
                    </Card>
                  )}

                  {g.checklist && g.checklist.length > 0 && (
                    <div className="rounded-md border border-border p-3">
                      <p className="mb-2 text-sm font-medium">检查清单</p>
                      <ul className="space-y-1">
                        {g.checklist.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <span>✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {g.examples && g.examples.length > 0 && (
                    <div className="rounded-md border border-border p-3">
                      <p className="mb-2 text-sm font-medium">对比示例</p>
                      <div className="space-y-2">
                        {g.examples.map((item, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-sm text-destructive">× {item.bad}</p>
                            <p className="text-sm text-green-600">✓ {item.good}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {g.dimensions && g.dimensions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">评估维度：</span>
                      {g.dimensions.map((d) => (
                        <Badge key={d} variant="outline">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {g.required && g.required.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">必画：</span>
                      {g.required.map((d) => (
                        <Badge key={d} variant="destructive">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {g.optional && g.optional.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">选画：</span>
                      {g.optional.map((d) => (
                        <Badge key={d} variant="outline">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {g.tips && g.tips.length > 0 && (
                    <div className="rounded-md border border-border p-3">
                      <p className="mb-2 text-sm font-medium">画图提示</p>
                      <ul className="space-y-1">
                        {g.tips.map((item, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {g.suggested_points && g.suggested_points.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">反思切入点：</span>
                      {g.suggested_points.map((d) => (
                        <Badge key={d} variant="outline">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
