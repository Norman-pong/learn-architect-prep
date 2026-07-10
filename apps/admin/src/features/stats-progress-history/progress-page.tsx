import { SectionPageLayout } from "@/components/layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChartOutlined } from "@/components/ui/icons";
import { useHeatmap, useCalendar, useChapterProgress } from "./api";
import { Heatmap, HeatmapLegend } from "./components/heatmap";
import { ProgressCalendar } from "./components/progress-calendar";
import { ChapterProgressList } from "./components/chapter-progress";
import { useResolvedDark } from "./lib/use-resolved-dark";
import { HEAT_LEVEL_BG_LIGHT, HEAT_LEVEL_BG_DARK } from "./constants";

function YearSelector({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y} 年
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MonthSelector({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const [y, m] = value.split("-").map(Number);
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  return (
    <div className="flex items-center gap-2">
      <Select
        value={String(y)}
        onValueChange={(ny) => onChange(`${ny}-${String(m).padStart(2, "0")}`)}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year} 年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(m).padStart(2, "0")} onValueChange={(nm) => onChange(`${y}-${nm}`)}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, idx) => (
            <SelectItem key={month} value={month}>
              {idx + 1} 月
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProgressPage() {
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: heatmap, isLoading: heatmapLoading } = useHeatmap(year);
  const { data: calendar, isLoading: calendarLoading } = useCalendar(month);
  const { data: chapters, isLoading: chaptersLoading } = useChapterProgress();

  const isDark = useResolvedDark();
  const palette = isDark ? HEAT_LEVEL_BG_DARK : HEAT_LEVEL_BG_LIGHT;

  return (
    <SectionPageLayout title="学习进度" description="学习日历与热力图">
      <Card>
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">年度学习热力图</CardTitle>
          <YearSelector value={year} onChange={setYear} />
        </CardHeader>
        <CardContent className="space-y-4">
          {heatmapLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-32" />
            </div>
          ) : heatmap ? (
            <>
              <div className="flex flex-wrap gap-4 text-sm sm:gap-6">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">活跃天数</p>
                  <p className="font-semibold">{heatmap.totalActiveDays} 天</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">动作总数</p>
                  <p className="font-semibold">{heatmap.totalCount} 次</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">学习时长</p>
                  <p className="font-semibold">{Math.round(heatmap.totalDuration)} 分钟</p>
                </div>
              </div>
              <Heatmap data={heatmap} selectedDate={selectedDate} onSelect={setSelectedDate} />
              <div className="flex justify-end">
                <HeatmapLegend palette={palette} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <BarChartOutlined className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">暂无热力图数据</p>
              <p className="mt-1 text-xs text-muted-foreground">选择其他年份查看历史数据</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">月度学习日历</CardTitle>
          <MonthSelector value={month} onChange={setMonth} />
        </CardHeader>
        <CardContent>
          {calendarLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-32" />
            </div>
          ) : calendar ? (
            <ProgressCalendar
              data={calendar}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <BarChartOutlined className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">暂无日历数据</p>
              <p className="mt-1 text-xs text-muted-foreground">选择其他月份查看历史数据</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">章节掌握度</CardTitle>
        </CardHeader>
        <CardContent>
          {chaptersLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : chapters && chapters.length > 0 ? (
            <ChapterProgressList chapters={chapters} />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <BarChartOutlined className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">暂无章节进度数据</p>
              <p className="mt-1 text-xs text-muted-foreground">完成练习后系统将自动统计掌握度</p>
            </div>
          )}
        </CardContent>
      </Card>
    </SectionPageLayout>
  );
}
