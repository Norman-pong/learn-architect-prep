import type { CaseReport, Dimension } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function DimensionCard({ dimension }: { dimension: Dimension }) {
  const pct = dimension.maxScore ? (dimension.score / dimension.maxScore) * 100 : 0;
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{dimension.name}</span>
          <Badge variant="secondary">权重 {dimension.weight}%</Badge>
          <span
            className={cn(
              "ml-auto text-sm font-semibold",
              pct >= 60 ? "text-emerald-600" : "text-amber-600",
            )}
          >
            {dimension.score} / {dimension.maxScore}
          </span>
        </div>
        <div className="mt-3">
          <Progress value={dimension.score} max={dimension.maxScore} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{dimension.comment}</p>
      </CardContent>
    </Card>
  );
}

interface CaseReportViewProps {
  report: CaseReport;
  onBack: () => void;
}

export function CaseReportView({ report, onBack }: CaseReportViewProps) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 py-6">
      <Card
        className={cn(
          "border-l-4",
          report.passed
            ? "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"
            : "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20",
        )}
      >
        <CardHeader>
          <CardTitle className="text-2xl">
            案例分析模拟考成绩：{report.score} / {report.maxTotalScore}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-lg font-medium">
            {report.passed ? "恭喜，已达到合格线" : "未达合格线，继续加油"}
          </p>
          <p className="text-sm text-muted-foreground">合格线：{report.passLine} 分</p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold tracking-tight">AI 评分维度</h3>
        <div className="grid gap-3">
          {report.dimensions.map((d) => (
            <DimensionCard key={d.name} dimension={d} />
          ))}
        </div>
      </section>

      {report.overallComment && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold tracking-tight">总体评价</h3>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed text-foreground">{report.overallComment}</p>
            </CardContent>
          </Card>
        </section>
      )}

      {report.improvementSuggestions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold tracking-tight">改进建议</h3>
          <Card>
            <CardContent className="pt-4">
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                {report.improvementSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      <div className="flex justify-center">
        <Button size="lg" onClick={onBack}>
          返回模拟考首页
        </Button>
      </div>
    </div>
  );
}
