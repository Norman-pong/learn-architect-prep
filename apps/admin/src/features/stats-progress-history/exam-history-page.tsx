import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useExamHistory, useExamTrends } from "./api";
import { EXAM_FILTER_OPTIONS, RANGE_OPTIONS } from "./constants";
import { ExamHistoryTable } from "./components/exam-history-table";
import { ExamTrendChart } from "./components/exam-trend-chart";
import type { ExamType, ScoreTrendPoint } from "./types";

export function ExamHistoryPage() {
  const [examTypeFilter, setExamTypeFilter] = useState<string>("");
  const [days, setDays] = useState<string>("90");

  const { data: history, isLoading: historyLoading } = useExamHistory(examTypeFilter, days);
  const { data: trends, isLoading: trendsLoading } = useExamTrends(examTypeFilter, days);

  const passScore = history?.passScore ?? trends?.passScore ?? 45;
  const examLabels = history?.examTypeLabels ?? {};
  const modeLabels = history?.modeLabels ?? {};

  const filteredItems = useMemo(() => {
    if (!history?.items) return [];
    if (!examTypeFilter) return history.items;
    return history.items.filter((i) => i.examType === examTypeFilter);
  }, [history, examTypeFilter]);

  const trendSeries = useMemo(() => {
    if (!trends?.total) return [];
    return trends.total.map((t) => ({
      examType: t.examType,
      label: t.examTypeLabel,
      points: t.points,
    }));
  }, [trends]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">成绩记录与趋势</h2>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">科目</span>
            <Select value={examTypeFilter} onValueChange={(v) => setExamTypeFilter(v ?? "")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAM_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">趋势区间</span>
            <Select value={days} onValueChange={(v) => setDays(v ?? "")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {trends && (
            <span className="text-sm text-muted-foreground">
              {trends.rangeStart} ~ {trends.rangeEnd}
            </span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">分数趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <Skeleton className="h-48" />
          ) : trendSeries.length > 0 ? (
            <ExamTrendChart
              series={
                trendSeries as { examType: ExamType; label: string; points: ScoreTrendPoint[] }[]
              }
              passScore={passScore}
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              暂无趋势数据
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">三科概况</CardTitle>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : trends?.total.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trends.total.map((t) => (
                <Card key={t.examType} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t.examTypeLabel}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">最近一次</span>
                      {t.latestScore == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant={t.latestPassed ? "default" : "destructive"}>
                          {t.latestScore}
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">历史最高</span>
                      <span>{t.bestScore ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">通过 / 总数</span>
                      <span>
                        {t.passedCount} / {t.attemptCount}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">历次记录</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <ExamHistoryTable
              rows={filteredItems}
              passScore={passScore}
              examLabels={examLabels}
              modeLabels={modeLabels}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
