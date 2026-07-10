import { useMemo } from "react";
import { usePrefersDark } from "@/hooks/usePrefersDark";
import { useThemeMode } from "@/stores/theme";
import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS, HEAT_LEVEL_BG_LIGHT, HEAT_LEVEL_BG_DARK } from "../constants";
import type { CalendarData, CalendarDay } from "../types";

interface MonthlyCalendarProps {
  data: CalendarData;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

function useResolvedDark(): boolean {
  const [mode] = useThemeMode();
  const prefersDark = usePrefersDark();
  const resolved: "light" | "dark" = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  return resolved === "dark";
}

export function ProgressCalendar({ data, selectedDate, onSelect }: MonthlyCalendarProps) {
  const isDark = useResolvedDark();
  const palette = isDark ? HEAT_LEVEL_BG_DARK : HEAT_LEVEL_BG_LIGHT;

  const cells = useMemo(() => {
    if (!data.days.length) return [];
    const firstDay = new Date(data.days[0].date + "T00:00:00");
    const firstWeekday = firstDay.getDay();
    const padded: Array<CalendarDay | null> = Array.from<CalendarDay | null>({
      length: firstWeekday,
    }).fill(null);
    padded.push(...data.days);
    return padded;
  }, [data.days]);

  if (!data.days.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-1.5 p-2">
      {WEEKDAY_LABELS.map((wd) => (
        <div key={wd} className="text-center text-xs font-medium text-muted-foreground">
          {wd}
        </div>
      ))}
      {cells.map((day, i) => {
        if (!day) {
          return <div key={`empty-${i}`} />;
        }
        const isSelected = day.date === selectedDate;
        const hasData = day.count > 0 || day.duration > 0;
        const dayNum = Number(String(day.date ?? "").slice(8, 10));
        const heatLevel = Math.min(4, Math.max(1, Math.ceil(day.duration / 15) + 1));
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            className={cn(
              "relative flex min-h-[48px] flex-col rounded-md p-1 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:min-h-[56px] sm:p-1.5",
              isSelected && "ring-2 ring-primary",
              !hasData && "border border-border bg-card text-foreground",
            )}
            style={{
              background: hasData ? palette[heatLevel] : undefined,
              color: hasData ? "#fff" : undefined,
            }}
          >
            <span className="text-[13px]">{dayNum}</span>
            {hasData && (
              <span className="mt-0.5 text-[10px] opacity-90">
                {day.count}次 · {day.duration}m
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
