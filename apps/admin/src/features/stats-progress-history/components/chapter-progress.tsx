import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ChapterProgress } from "../types";

interface ChapterProgressListProps {
  chapters: ChapterProgress[];
}

function masteryVariant(rate: number): "default" | "secondary" | "destructive" | "outline" {
  if (rate >= 75) return "default";
  if (rate >= 40) return "secondary";
  return "destructive";
}

function weightVariant(weight: number): "default" | "secondary" | "destructive" | "outline" {
  if (weight >= 5) return "destructive";
  if (weight >= 4) return "secondary";
  if (weight >= 3) return "outline";
  return "default";
}

export function ChapterProgressList({ chapters }: ChapterProgressListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {chapters.map((ch) => {
        const mastery = masteryVariant(ch.masteryRate);
        return (
          <Card key={ch.chapterId} className="transition-shadow hover:shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge variant={weightVariant(ch.examWeight)}>重点 {ch.examWeight}</Badge>
                <Badge variant="outline">{ch.section}</Badge>
              </div>
              <CardTitle className="text-base">{ch.chapterTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {ch.studiedKnowledgePoints}/{ch.totalKnowledgePoints} 知识点 · 复习{" "}
                {ch.totalReviews} 次
              </p>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">完成度</p>
                <Progress value={ch.completionRate} />
                <p className="text-right text-xs text-muted-foreground">
                  {ch.completionRate.toFixed(0)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">掌握度</p>
                <div className="flex items-center justify-between">
                  <Progress
                    value={ch.masteryRate}
                    className={cn("flex-1", mastery === "default" && "text-[hsl(var(--primary))]")}
                  />
                  <Badge variant={mastery} className="ml-2 shrink-0">
                    {ch.masteryRate.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
