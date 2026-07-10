import { cn } from "../../../lib/utils";
import type { AnswerNavItem } from "../types";

interface AnswerSheetProps {
  items: AnswerNavItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

export function AnswerSheet({ items, currentIndex, onSelect, className }: AnswerSheetProps) {
  return (
    <div className={cn("w-[220px] shrink-0", className)}>
      <div className="rounded-lg border bg-card p-3">
        <h3 className="mb-3 text-sm font-medium text-card-foreground">题号导航</h3>
        <div className="grid grid-cols-5 gap-1.5">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                "h-8 w-full rounded-md text-xs font-medium transition-colors",
                currentIndex === item.key
                  ? "bg-primary text-primary-foreground"
                  : item.answered
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                    : "border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {item.key + 1}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-50 dark:bg-emerald-950" />
            已答
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border" />
            未答
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
            当前
          </div>
        </div>
      </div>
    </div>
  );
}
