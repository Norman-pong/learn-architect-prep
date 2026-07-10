import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useDashboard, useRecommendations } from "./api";
import { DashboardCards } from "./components/dashboard-cards";
import { RecommendationList } from "./components/recommendation-list";

export const MOCK_DASHBOARD = {
  todayReviewCount: 12,
  streakDays: 7,
  weakPointCount: 3,
  lastMockScore: 82,
};

export const MOCK_RECOMMENDATIONS = [
  {
    knowledgePointId: "ch07",
    title: "系统架构设计基础知识",
    chapterId: "ch07",
    correctRate: 52,
    examWeight: 5,
    score: 240,
  },
  {
    knowledgePointId: "ch14",
    title: "云原生架构设计理论与实践",
    chapterId: "ch14",
    correctRate: 48,
    examWeight: 5,
    score: 260,
  },
  {
    knowledgePointId: "ch18",
    title: "安全架构设计理论与实践",
    chapterId: "ch18",
    correctRate: 55,
    examWeight: 5,
    score: 225,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { data: liveData, isLoading: loadingDashboard } = useDashboard();
  const { data: liveRecommendations, isLoading: loadingRecommendations } = useRecommendations();

  const data = liveData ?? MOCK_DASHBOARD;
  const recommendations = liveRecommendations ?? MOCK_RECOMMENDATIONS;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">学习仪表盘</h1>
        <Button onClick={() => navigate({ to: "/review" })}>去复习</Button>
      </div>

      <DashboardCards data={data} loading={loadingDashboard} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecommendationList
          items={recommendations}
          loading={loadingRecommendations}
          onNavigate={(chapterId) => navigate({ to: "/learn/$chapterId", params: { chapterId } })}
        />
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
          <div className="text-sm font-medium">成绩趋势</div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            成绩趋势图占位区（待接入）
          </p>
        </div>
      </div>
    </div>
  );
}
