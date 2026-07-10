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
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">练习统计</h2>

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">趋势概览</CardTitle>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <Skeleton className="h-5 w-64" />
          ) : latestTrend ? (
            <div className="flex items-center gap-2 text-sm">
              <span>
                最近一日 {latestTrend.date}：{latestTrend.total} 题，正确率{" "}
                {latestTrend.accuracy.toFixed(1)}%
              </span>
              {latestTrend.total === 0 && <Badge variant="outline">暂无数据</Badge>}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">暂无趋势数据</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">章节正确率</CardTitle>
        </CardHeader>
        <CardContent>
          {chapterLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <StatsTable type="chapter" data={(chapterStats as ChapterStats[]) ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">知识点薄弱度</CardTitle>
        </CardHeader>
        <CardContent>
          {knowledgeLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <StatsTable type="knowledge" data={(knowledgeStats as KnowledgePointStats[]) ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
