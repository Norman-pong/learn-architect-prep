import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen01Icon,
  ArrowReloadVerticalIcon,
  Edit01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Hugeicon } from "@/components/ui/icons";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { ReviewCard } from "../types";
import type { Annotation } from "@/lib/annotations-api";
import { RATING_LABELS } from "../constants";

export interface ReviewCardProps {
  card: ReviewCard;
  remainingCount: number;
  onRate: (score: number) => void;
  isRating?: boolean;
  annotations?: Annotation[];
}

const ratingColors = [
  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  "bg-orange-600 text-white hover:bg-orange-700",
  "bg-amber-500 text-white hover:bg-amber-600",
  "bg-yellow-500 text-black hover:bg-yellow-600",
  "bg-emerald-500 text-white hover:bg-emerald-600",
  "bg-primary text-primary-foreground hover:bg-primary-hover",
];

export function ReviewCardComponent({
  card,
  remainingCount,
  onRate,
  isRating = false,
  annotations,
}: ReviewCardProps) {
  const [flipped, setFlipped] = useState(false);

  const handleRate = useCallback(
    (score: number) => {
      onRate(score);
      setFlipped(false);
    },
    [onRate],
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hugeicon iconData={BookOpen01Icon} size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">今日复习</h2>
          <Badge variant="secondary" className="ml-1">
            剩余 {remainingCount} 题
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)} className="gap-1">
          <Hugeicon iconData={flipped ? ArrowReloadVerticalIcon : ArrowRight01Icon} size={16} />
          {flipped ? "返回题目" : "查看评分"}
        </Button>
      </div>

      {/* Flip container */}
      <div className="group relative" style={{ perspective: "1000px" }}>
        <div
          className={cn(
            "relative transition-transform duration-500",
            flipped && "[transform:rotateY(180deg)]",
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front: Question */}
          <Card
            className={cn(
              "border-border bg-card shadow-sm",
              flipped && "[backface-visibility:hidden]",
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-xl font-semibold leading-snug text-foreground">
                    {card.title}
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {card.chapterTitle}
                    </Badge>
                    {card.examWeight > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        title={`考频权重 ${card.examWeight}`}
                      >
                        权重 {card.examWeight}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {card.content ? (
                <div className="rounded-md border border-border bg-background/50 p-4">
                  <MarkdownRenderer content={card.content} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无知识点内容</p>
              )}

              {annotations && annotations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Hugeicon iconData={Edit01Icon} size={16} className="text-primary" />
                    我的批注
                  </div>
                  <div className="space-y-2">
                    {annotations.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground"
                      >
                        <span
                          className={cn(
                            "mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-medium",
                            a.type === "highlight" && "bg-warning/15 text-warning-foreground",
                            a.type === "note" && "bg-primary/10 text-primary",
                            a.type === "question" && "bg-destructive/10 text-destructive",
                          )}
                        >
                          {a.type === "highlight" && "高亮"}
                          {a.type === "note" && "笔记"}
                          {a.type === "question" && "疑问"}
                        </span>
                        {a.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={() => setFlipped(true)} className="gap-1">
                  <Hugeicon iconData={ArrowRight01Icon} size={16} />
                  翻转评分
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Back: Rating */}
          <Card
            className={cn(
              "absolute inset-0 border-border bg-card shadow-sm",
              "[backface-visibility:hidden] [transform:rotateY(180deg)]",
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-foreground">掌握程度自评</CardTitle>
              <p className="text-sm text-muted-foreground">
                请根据你对「{card.title}」的掌握情况选择一个评分
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {RATING_LABELS.map((label, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    disabled={isRating}
                    onClick={() => handleRate(idx)}
                    className={cn(
                      "h-auto flex-col items-center justify-center gap-1 rounded-lg border border-border px-3 py-4 transition-all",
                      "hover:scale-[1.02] hover:shadow-md",
                      "disabled:opacity-60",
                      ratingColors[idx],
                    )}
                  >
                    <span className="text-2xl font-bold">{idx}</span>
                    <span className="text-xs font-medium">{label}</span>
                  </Button>
                ))}
              </div>

              {isRating && <p className="text-center text-sm text-muted-foreground">提交中…</p>}

              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => setFlipped(false)}>
                  返回题目
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
