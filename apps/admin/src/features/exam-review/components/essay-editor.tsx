import * as React from "react";
import {
  THESIS_SECTIONS,
  THESIS_SECTION_TARGETS,
  THESIS_TOTAL_TARGET,
  type ThesisSectionKey,
  type ThesisSections,
} from "@archprep/shared";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { countWords } from "../lib/essay-helpers";

export interface EssayEditorProps {
  sections: ThesisSections;
  onChange: (key: ThesisSectionKey, value: string) => void;
  onSave?: (sections: ThesisSections) => void | Promise<void>;
  writingId?: string;
  readOnly?: boolean;
  className?: string;
}

function sectionStatus(
  count: number,
  target: { min: number; max: number },
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (count < target.min) return { label: "不足", variant: "secondary" };
  if (count > target.max) return { label: "超标", variant: "destructive" };
  return { label: "达标", variant: "default" };
}

function totalStatus(count: number): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (count < THESIS_TOTAL_TARGET.min) return { label: "未达标", variant: "secondary" };
  if (count > THESIS_TOTAL_TARGET.max) return { label: "超标", variant: "destructive" };
  return { label: "符合要求", variant: "default" };
}

export function EssayEditor({
  sections,
  onChange,
  onSave,
  readOnly = false,
  className,
}: EssayEditorProps) {
  const [activeTab, setActiveTab] = React.useState<ThesisSectionKey>(THESIS_SECTIONS[0]);
  const [saveState, setSaveState] = React.useState<"saved" | "saving" | "unsaved">("saved");
  const lastSavedRef = React.useRef(sections);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = React.useMemo(() => {
    let sum = 0;
    for (const key of THESIS_SECTIONS) {
      sum += countWords(sections[key]);
    }
    return sum;
  }, [sections]);

  React.useEffect(() => {
    const changed = JSON.stringify(lastSavedRef.current) !== JSON.stringify(sections);
    if (!changed) return;

    setSaveState("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await onSave?.(sections);
        lastSavedRef.current = sections;
        setSaveState("saved");
      } catch {
        setSaveState("unsaved");
      }
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sections, onSave]);

  const totalStat = totalStatus(total);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ThesisSectionKey)}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="flex-wrap h-auto gap-1 p-1.5">
          {THESIS_SECTIONS.map((key) => {
            const count = countWords(sections[key]);
            const target = THESIS_SECTION_TARGETS[key];
            const status = sectionStatus(count, target);
            return (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-2 text-sm data-[selected]:bg-background"
              >
                <span>{target.label}</span>
                <Badge
                  variant={status.variant}
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    status.variant === "default" &&
                      "bg-emerald-600 text-white hover:bg-emerald-600",
                    status.variant === "secondary" && "bg-amber-500 text-white hover:bg-amber-500",
                  )}
                >
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {THESIS_SECTIONS.map((key) => {
            const target = THESIS_SECTION_TARGETS[key];
            return (
              <TabsContent key={key} value={key} className="h-full mt-0">
                <div className="flex flex-col h-full gap-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {target.label} · 建议字数 {target.min}–{target.max}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        countWords(sections[key]) < target.min && "text-amber-600",
                      )}
                    >
                      当前 {countWords(sections[key])} 字
                    </span>
                  </div>
                  <Textarea
                    value={sections[key]}
                    onChange={(e) => onChange(key, e.target.value)}
                    disabled={readOnly}
                    placeholder={`请输入${target.label}内容…`}
                    autoResize
                    className="flex-1 min-h-[200px] resize-none text-base leading-relaxed"
                  />
                </div>
              </TabsContent>
            );
          })}
        </div>
      </Tabs>

      <div className="sticky bottom-0 z-10 border-t bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">总字数</span>
            <span className="font-semibold tabular-nums">
              {total} / {THESIS_TOTAL_TARGET.min}–{THESIS_TOTAL_TARGET.max}
            </span>
            <Badge
              variant={totalStat.variant}
              className={cn(
                totalStat.variant === "default" && "bg-emerald-600 text-white hover:bg-emerald-600",
                totalStat.variant === "secondary" && "bg-amber-500 text-white hover:bg-amber-500",
              )}
            >
              {totalStat.label}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {saveState === "saved" && <span className="text-emerald-600">已保存</span>}
            {saveState === "saving" && (
              <span className="text-muted-foreground animate-pulse">保存中…</span>
            )}
            {saveState === "unsaved" && <span className="text-amber-600">未保存</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
