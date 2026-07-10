import { SectionPageLayout } from "@/components/layout";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RobotOutlined, TargetOutlined, ArrowRightOutlined } from "@/components/ui/icons";
import { useWeakness, useAISelectWeakness } from "../api";

export function WeaknessPanel() {
  const navigate = useNavigate();
  const { data: points = [], isLoading } = useWeakness();
  const aiMutation = useAISelectWeakness();

  const weakOnly = points.filter((p) => p.isWeak);

  const handleAISelect = async (chapterId: string) => {
    const result = await aiMutation.mutateAsync(chapterId);
    if (result.questions.length > 0) {
      navigate({
        to: "/quiz",
        search: { chapter: chapterId, mode: "chapter", smart: "true" },
      });
    }
  };

  if (isLoading) {
    return (
      <SectionPageLayout title="薄弱点" description="薄弱知识点专项练习">
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="grid gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </SectionPageLayout>
    );
  }

  if (weakOnly.length === 0) {
    return (
      <SectionPageLayout title="薄弱点" description="薄弱知识点专项练习">
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/30">
              <TargetOutlined className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-medium">暂无薄弱知识点</p>
              <p className="text-sm text-muted-foreground">继续保持，你的表现很棒！</p>
            </div>
            <Button onClick={() => navigate({ to: "/quiz" })}>
              去练习
              <ArrowRightOutlined className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout
      title="薄弱点"
      description="薄弱知识点专项练习"
      actions={<Badge variant="destructive">{weakOnly.length} 个薄弱点</Badge>}
    >
      <div className="grid gap-4">
        {weakOnly.map((item) => (
          <Card key={item.chapterId} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{item.chapterName}</CardTitle>
                    <Badge variant="destructive">薄弱</Badge>
                    {item.section && <Badge variant="outline">{item.section}</Badge>}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAISelect(item.chapterId)}
                  disabled={aiMutation.isPending && aiMutation.variables === item.chapterId}
                  className="w-full sm:w-auto"
                >
                  <RobotOutlined className="h-4 w-4 mr-1" />
                  {aiMutation.isPending && aiMutation.variables === item.chapterId
                    ? "选题中..."
                    : "智能选题"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">正确率</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {item.correctRate}%
                </span>
              </div>
              <Progress value={item.correctRate} className="h-2" />
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-4">
                <span>共 {item.totalQuestions} 题</span>
                <span>答对 {item.correctCount} 题</span>
                <span>答错 {item.totalQuestions - item.correctCount} 题</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionPageLayout>
  );
}
