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
import { Badge } from "@/components/ui/badge";
import { BarChartOutlined, DatabaseOutlined } from "@/components/ui/icons";
import { useChapterStats, useDailyTrends, useKnowledgePointStats } from "./api";
import { DAYS_OPTIONS } from "./constants";
import { StatsTable } from "./components/stats-table";
import type { ChapterStats, KnowledgePointStats } from "./types";

export type StatsType = "chapter" | "knowledge";

export function StatsPage() {
  const [days, setDays] = useState<string>("");

  const { data: chapterStats, isLoading: chapterLoading } = useChapterStats(days);
  const { data: knowledgeStats, isLoading: knowledgeLoading } = useKnowledgePointStats(days);
  const { data: trends, isLoading: trendsLoading } = useDailyTrends(days);

  const latestTrend = trends && trends.length > 0 ? trends[trends.length - 1] : null;

  return (
    <SectionPageLayout
      title="练习统计"
      description="按章节/知识点查看正确率"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">时间维度：</span>
          <Select value={days} onValueChange={(v) => setDays(v ?? "")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">趋势概览</CardTitle>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <Skeleton className="h-5 w-64" />
          ) : latestTrend ? (
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
              <span>
                最近一日 {String(latestTrend.date ?? "").slice(0, 10)}：{latestTrend.total}{" "}
                题，正确率 {latestTrend.accuracy.toFixed(1)}%
              </span>
              {latestTrend.total === 0 && <Badge variant="outline">暂无数据</Badge>}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-muted p-4">
                <BarChartOutlined className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">暂无趋势数据</p>
              <p className="mt-1 text-xs text-muted-foreground">选择时间维度后数据将在此显示</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">章节正确率</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {chapterLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : chapterStats && chapterStats.length > 0 ? (
            <StatsTable type="chapter" data={chapterStats as ChapterStats[]} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-muted p-4">
                <DatabaseOutlined className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">暂无章节统计数据</p>
              <p className="mt-1 text-xs text-muted-foreground">完成练习后数据将在此显示</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">知识点薄弱度</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {knowledgeLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : knowledgeStats && knowledgeStats.length > 0 ? (
            <StatsTable type="knowledge" data={knowledgeStats as KnowledgePointStats[]} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-muted p-4">
                <DatabaseOutlined className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">暂无知识点统计数据</p>
              <p className="mt-1 text-xs text-muted-foreground">完成练习后数据将在此显示</p>
            </div>
          )}
        </CardContent>
      </Card>
    </SectionPageLayout>
  );
}
