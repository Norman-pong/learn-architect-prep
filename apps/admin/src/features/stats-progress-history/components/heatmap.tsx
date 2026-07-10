import type { HeatmapDay } from "../types";
import { useMemo } from "react";
import { usePrefersDark } from "@/hooks/usePrefersDark";
import { useThemeMode } from "@/stores/theme";
import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS, HEAT_LEVEL_BG_LIGHT, HEAT_LEVEL_BG_DARK } from "../constants";
import type { HeatmapData } from "../types";

interface HeatmapProps {
  data: HeatmapData;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

function useResolvedDark(): boolean {
  const [mode] = useThemeMode();
  const prefersDark = usePrefersDark();
  const resolved: "light" | "dark" = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  return resolved === "dark";
}

function buildHeatmapGrid(days: HeatmapDay[], year: number): Array<HeatmapDay | null>[] {
  const firstDate = new Date(year, 0, 1);
  const startWeekday = firstDate.getDay();
  const cells: Array<HeatmapDay | null> = Array.from<HeatmapDay | null>({
    length: startWeekday,
  }).fill(null);
  for (const d of days) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<HeatmapDay | null>[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function monthLabelsForYear(year: number): Array<{ col: number; label: string }> {
  const result: Array<{ col: number; label: string }> = [];
  let lastMonth = -1;
  const firstDate = new Date(year, 0, 1);
  const firstWeekday = firstDate.getDay();
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(year, m, 1);
    const offsetDays = Math.floor(
      (monthStart.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const col = Math.floor((firstWeekday + offsetDays) / 7);
    if (m === 0 || col > result[result.length - 1].col + 1) {
      result.push({ col, label: `${m + 1}月` });
      lastMonth = m;
    } else if (m - lastMonth >= 1) {
      // skip — too cramped
    }
  }
  return result;
}

export function Heatmap({ data, selectedDate, onSelect }: HeatmapProps) {
  const isDark = useResolvedDark();
  const palette = isDark ? HEAT_LEVEL_BG_DARK : HEAT_LEVEL_BG_LIGHT;
  const weeks = useMemo(() => buildHeatmapGrid(data.days, data.year), [data.days, data.year]);
  const monthMarks = useMemo(() => monthLabelsForYear(data.year), [data.year]);

  const cellSize = 12;
  const cellGap = 2;

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid rounded-lg border border-border bg-card p-2"
        style={{
          gridTemplateColumns: `auto repeat(${weeks.length}, ${cellSize}px)`,
          gridAutoRows: `${cellSize}px`,
          gap: cellGap,
        }}
      >
        {/* Month labels row */}
        <div />
        {weeks.map((_, colIdx) => {
          const mark = monthMarks.find((m) => m.col === colIdx);
          return (
            <div
              key={`m-${colIdx}`}
              className="text-[10px] leading-[12px] text-muted-foreground"
              style={{ gridRow: 1, gridColumn: colIdx + 2 }}
            >
              {mark ? mark.label : ""}
            </div>
          );
        })}

        {/* Weekday labels */}
        {WEEKDAY_LABELS.map((wd, rowIdx) => (
          <div
            key={`wd-${rowIdx}`}
            className="pr-1.5 text-right text-[10px] leading-[12px] text-muted-foreground"
            style={{
              gridRow: rowIdx + 2,
              gridColumn: 1,
              visibility: rowIdx % 2 === 1 ? "visible" : "hidden",
            }}
          >
            {wd}
          </div>
        ))}

        {/* Day cells */}
        {weeks.flatMap((week, colIdx) =>
          week.map((day, rowIdx) => {
            if (!day) {
              return (
                <div
                  key={`empty-${colIdx}-${rowIdx}`}
                  style={{ gridRow: rowIdx + 2, gridColumn: colIdx + 2 }}
                />
              );
            }
            const isSelected = day.date === selectedDate;
            return (
              <button
                key={day.date}
                type="button"
                aria-label={`${day.date} 学习 ${day.count} 次 ${day.duration} 分钟`}
                onClick={() => onSelect(day.date)}
                title={`${day.date} · ${day.count} 次 · ${day.duration} 分钟`}
                className={cn(
                  "rounded-[2px] p-0 transition-transform duration-100 ease-out hover:scale-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  isSelected && "ring-2 ring-primary",
                )}
                style={{
                  gridRow: rowIdx + 2,
                  gridColumn: colIdx + 2,
                  width: cellSize,
                  height: cellSize,
                  background: palette[day.level],
                  border: `1px solid hsl(var(--border))`,
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

export function HeatmapLegend({ palette }: { palette: string[] }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground">少</span>
      {palette.map((color, i) => (
        <span
          key={i}
          className="inline-block rounded-[2px] border border-border"
          style={{ width: 12, height: 12, background: color }}
        />
      ))}
      <span className="text-[11px] text-muted-foreground">多</span>
    </div>
  );
}
