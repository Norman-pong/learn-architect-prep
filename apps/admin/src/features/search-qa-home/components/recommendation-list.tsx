import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOutlined } from "@/components/ui/icons";
import type { RecommendItem } from "../types";

export function RecommendationList({
  items,
  loading,
  onNavigate,
}: {
  items: RecommendItem[];
  loading: boolean;
  onNavigate: (chapterId: string) => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">复习推荐</CardTitle>
        <p className="text-sm text-muted-foreground">基于最近练习的薄弱点推荐</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <BookOutlined className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">暂无薄弱知识点</p>
            <p className="mt-1 text-xs text-muted-foreground">
              继续保持，系统会在你出现错题时自动推荐
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.knowledgePointId}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-card/50 px-4 py-3 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    权重 {item.examWeight}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  正确率 {item.correctRate}% · 推荐分 {item.score}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1 text-xs"
                onClick={() => onNavigate(item.chapterId)}
              >
                去复习
                <BookOutlined className="size-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
