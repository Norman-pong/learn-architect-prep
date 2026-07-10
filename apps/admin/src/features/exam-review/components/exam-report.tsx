import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import { formatSeconds } from "../constants";

export interface ExamReportBase {
  title: string;
  score: number;
  total: number;
  passLine: number;
  passed: boolean;
  duration: number;
}

interface ExamReportProps {
  report: ExamReportBase;
  children: React.ReactNode;
}

function ScoreRing({ score, total, passed }: { score: number; total: number; passed: boolean }) {
  const pct = Math.min(100, Math.max(0, (score / total) * 100));
  const radius = 56;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-muted-foreground/20"
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.6s ease-out" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={cn(passed ? "text-emerald-500" : "text-destructive")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn("text-3xl font-bold", passed ? "text-emerald-600" : "text-destructive")}
        >
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/ {total}</span>
      </div>
    </div>
  );
}

export function ExamReport({ report, children }: ExamReportProps) {
  const navigate = useNavigate();
  const pct = Math.min(100, Math.max(0, (report.score / report.total) * 100));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {/* Score Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{report.title}</CardTitle>
            <Badge variant={report.passed ? "default" : "destructive"}>
              {report.passed ? "通过" : "未通过"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <ScoreRing score={report.score} total={report.total} passed={report.passed} />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">得分率</span>
                <span className="font-medium">{pct.toFixed(1)}%</span>
              </div>
              <Progress value={report.score} max={report.total} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">及格线</span>
                <span className="font-medium">{report.passLine} 分</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">用时</span>
                <span className="font-medium">{formatSeconds(report.duration)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension-specific sections */}
      {children}

      {/* Back button */}
      <div className="flex justify-center pt-2">
        <Button variant="outline" onClick={() => navigate({ to: "/exam" })}>
          返回模拟考首页
        </Button>
      </div>
    </div>
  );
}
