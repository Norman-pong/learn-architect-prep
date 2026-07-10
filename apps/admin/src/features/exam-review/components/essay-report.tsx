import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EssayReport as EssayReportType } from "../types";
import { formatSeconds } from "../constants";
import { AiScoringPanel } from "./ai-scoring-panel";

interface EssayReportProps {
  report: EssayReportType;
  onBack?: () => void;
}

export function EssayReport({ report, onBack }: EssayReportProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <div className="rounded-lg border bg-card p-6 text-center">
        <h2 className="text-2xl font-bold text-card-foreground">
          论文模拟考成绩：{report.score} / {report.total}
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <Badge variant={report.passed ? "default" : "destructive"}>
            {report.passed ? "已通过" : "未通过"}
          </Badge>
          <span>合格线：{report.passLine} 分</span>
          <span>用时：{formatSeconds(report.duration)}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">五维度评分</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.dimensions.map((d) => {
            const pct = Math.round((d.score / d.maxScore) * 100);
            const ok = d.score >= d.maxScore * 0.6;
            return (
              <div key={d.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{d.name}</span>
                  <span className={cn("tabular-nums", !ok && "text-amber-600")}>
                    {d.score} / {d.maxScore}（权重 {d.weight}%）
                  </span>
                </div>
                <Progress value={pct} max={100} />
                <p className="text-xs text-muted-foreground">{d.comment}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {report.deductions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">扣分项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.deductions.map((d, i) => {
              const severityClass =
                d.severity === "critical"
                  ? "destructive"
                  : d.severity === "major"
                    ? "secondary"
                    : "outline";
              const severityText =
                d.severity === "critical" ? "严重" : d.severity === "major" ? "重要" : "轻微";
              return (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{d.reason}</span>
                    <Badge variant={severityClass}>{severityText}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{d.suggestion}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">逐段点评</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.sectionFeedbacks.map((sf, i) => (
            <div key={i} className="rounded-md border p-3">
              <p className="text-sm font-medium">{sf.section}</p>
              <p className="mt-1 text-sm text-muted-foreground">{sf.comment}</p>
              {sf.suggestions.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {sf.suggestions.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">总体评价</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-card-foreground">{report.overallComment}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">改进建议</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-card-foreground">
            {report.improvementSuggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {report.writingId && <AiScoringPanel writingId={report.writingId} />}

      {onBack && (
        <div className="flex justify-center">
          <Button onClick={onBack}>返回模拟考首页</Button>
        </div>
      )}
    </div>
  );
}
