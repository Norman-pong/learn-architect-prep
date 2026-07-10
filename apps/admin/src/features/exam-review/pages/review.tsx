import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Hugeicon } from "@/components/ui/icons";
import {
  BookOpen01Icon,
  CircleCheckIcon as CheckCircleIcon,
  RefreshIcon,
  Home01Icon,
  ArrowRightIcon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";
import { useReviewQueue, useRateReview } from "../api";
import { useAnnotations } from "../lib/use-annotations";
import { ReviewCardComponent } from "../components/review-card";
import type { ReviewCard } from "../types";

export function ReviewPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useReviewQueue();
  const rateMutation = useRateReview();

  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const currentCard = queue[0];

  const { annotations } = useAnnotations(currentCard?.knowledgePointId);

  // Seed local queue from fetched data.
  useEffect(() => {
    if (data) {
      setQueue(data);
    }
  }, [data]);

  const handleRate = useCallback(
    async (score: number) => {
      if (!currentCard) return;
      try {
        await rateMutation.mutateAsync({ cardId: currentCard.cardId, score });
        // Remove the rated card from local queue and refetch.
        setQueue((prev) => prev.slice(1));
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "评分提交失败");
      }
    },
    [currentCard, rateMutation, refetch],
  );

  const totalCount = data?.length ?? 0;
  const completedCount = totalCount - queue.length;

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hugeicon iconData={BookOpen01Icon} size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">今日复习</h2>
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center space-y-6 p-4 pt-16">
        <Hugeicon iconData={Alert01Icon} size={48} className="text-destructive" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">加载失败</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "无法加载复习队列，请稍后重试。"}
          </p>
        </div>
        <Button onClick={() => refetch()} className="gap-1">
          <Hugeicon iconData={RefreshIcon} size={16} />
          重试
        </Button>
      </div>
    );
  }

  // ── Empty state ──
  if (!data || data.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center space-y-6 p-4 pt-16">
        <Hugeicon iconData={CheckCircleIcon} size={48} className="text-emerald-500" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">暂无复习任务</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            当前没有到期的复习卡片，去模拟考或学习模块继续积累吧。
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/exam" })} className="gap-1">
            <Hugeicon iconData={BookOpen01Icon} size={16} />
            模拟考
          </Button>
          <Button onClick={() => navigate({ to: "/learn" })} className="gap-1">
            <Hugeicon iconData={Home01Icon} size={16} />
            学习首页
          </Button>
        </div>
      </div>
    );
  }

  // ── Finished state ──
  if (!currentCard) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center space-y-6 p-4 pt-16">
        <Hugeicon iconData={CheckCircleIcon} size={48} className="text-primary" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">复习完成 🎉</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            本次共复习 {totalCount} 张卡片，继续保持！
          </p>
        </div>
        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>完成进度</span>
            <span>
              {totalCount} / {totalCount}
            </span>
          </div>
          <Progress value={100} />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/exam" })} className="gap-1">
            <Hugeicon iconData={BookOpen01Icon} size={16} />
            模拟考
          </Button>
          <Button onClick={() => navigate({ to: "/" })} className="gap-1">
            <Hugeicon iconData={Home01Icon} size={16} />
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  // ── Active review ──
  return (
    <div className="mx-auto w-full max-w-3xl p-4 pt-6">
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Hugeicon iconData={BookOpen01Icon} size={18} className="text-primary" />
            <span>今日复习</span>
          </div>
          <span>
            {completedCount} / {totalCount}
          </span>
        </div>
        <Progress value={completedCount} max={totalCount} />
      </div>

      <ReviewCardComponent
        card={currentCard}
        remainingCount={queue.length}
        onRate={handleRate}
        isRating={rateMutation.isPending}
        annotations={annotations}
      />

      <div className="mt-6 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/exam" })}
          className="gap-1 text-muted-foreground"
        >
          <Hugeicon iconData={ArrowRightIcon} size={16} />
          返回模拟考首页
        </Button>
      </div>
    </div>
  );
}
