import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { THESIS_SECTION_TARGETS, type ThesisSectionKey } from "@archprep/shared";
import { countWords } from "@/lib/word-count";

interface SectionEditorProps {
  sectionKey: ThesisSectionKey;
  value: string;
  onChange: (next: string) => void;
}

export function SectionEditor({ sectionKey, value, onChange }: SectionEditorProps) {
  const meta = THESIS_SECTION_TARGETS[sectionKey];
  const count = countWords(value);

  const status = useMemo(() => {
    if (count === 0) return { variant: "secondary" as const, label: "未开始" };
    if (count < meta.min) return { variant: "outline" as const, label: `未达下限（${meta.min}）` };
    if (count > meta.max)
      return { variant: "destructive" as const, label: `超出上限（${meta.max}）` };
    return { variant: "default" as const, label: "字数合格" };
  }, [count, meta.min, meta.max]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">{meta.label}</span>
          <Badge variant="outline" className="font-mono tabular-nums">
            {count} 字
          </Badge>
          <span className="text-xs text-muted-foreground">
            建议 {meta.min}-{meta.max} 字
          </span>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`请输入${meta.label}（推荐 ${meta.min}-${meta.max} 字）…`}
        maxLength={6000}
        className="min-h-[320px] resize-y leading-relaxed"
        aria-label={`${meta.label}编辑区`}
      />
    </div>
  );
}
