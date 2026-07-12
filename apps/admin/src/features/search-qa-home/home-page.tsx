import { useNavigate } from "@tanstack/react-router";
import { SectionPageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BulbOutlined,
  TrophyOutlined,
  SunOutlined,
  EditOutlined,
  ArrowRightOutlined,
  BookOutlined,
  DesktopOutlined,
} from "@/components/ui/icons";
import { useDashboard, useRecommendations } from "./api";
import { RecommendationList } from "./components/recommendation-list";

export const MOCK_DASHBOARD = {
  todayReviewCount: 12,
  streakDays: 7,
  weakPointCount: 3,
  lastMockScore: 82,
};

export const MOCK_RECOMMENDATIONS: Array<{
  knowledgePointId: string;
  title: string;
  chapterId: string;
  correctRate: number;
  examWeight: number;
  score: number;
}> = [];

export function HomePage() {
  const navigate = useNavigate();
  const { data: liveData } = useDashboard();
  const { data: liveRecommendations, isLoading: loadingRecommendations } = useRecommendations();

  const data = liveData ?? MOCK_DASHBOARD;
  const recommendations = liveRecommendations ?? MOCK_RECOMMENDATIONS;

  return (
    <SectionPageLayout
      title="学习仪表盘"
      description="基于最近练习的薄弱点推荐"
      actions={
        <Button onClick={() => navigate({ to: "/review" })}>
          去复习
          <ArrowRightOutlined className="ml-1 h-4 w-4" />
        </Button>
      }
    >
      {/* ── Today's tasks hero band ── */}
      <section
        aria-label="今日任务"
        className="rounded-xl border border-border bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-4 sm:p-6"
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold tracking-tight text-foreground">今日任务</h2>
          <p className="text-sm text-muted-foreground">
            优先攻克薄弱点，配合模考巩固 —— 三步走，今日可见进展。
          </p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <Button
            onClick={() => navigate({ to: "/quiz" })}
            className="h-auto justify-between gap-2 px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <EditOutlined className="h-4 w-4" />
              开始练习
            </span>
            <ArrowRightOutlined className="h-4 w-4 opacity-80" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/review" })}
            className="h-auto justify-between gap-2 px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <BookOutlined className="h-4 w-4" />
              进入复习
            </span>
            <ArrowRightOutlined className="h-4 w-4 opacity-80" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/exam/comp" })}
            className="h-auto justify-between gap-2 px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <DesktopOutlined className="h-4 w-4" />
              开始模考
            </span>
            <ArrowRightOutlined className="h-4 w-4 opacity-80" />
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<EditOutlined className="h-5 w-5" />}
          label="今日复习"
          value={data.todayReviewCount}
          tone="primary"
        />
        <MetricCard
          icon={<TrophyOutlined className="h-5 w-5" />}
          label="连续学习"
          value={`${data.streakDays}天`}
          tone="success"
        />
        <MetricCard
          icon={<BulbOutlined className="h-5 w-5" />}
          label="薄弱点预警"
          value={data.weakPointCount}
          tone="warning"
        />
        <MetricCard
          icon={<SunOutlined className="h-5 w-5" />}
          label="上次模考"
          value={data.lastMockScore ?? "—"}
          tone="default"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-base font-semibold">复习推荐</h2>
          {recommendations.length > 0 ? (
            <RecommendationList
              items={recommendations}
              loading={loadingRecommendations}
              onNavigate={(chapterId) =>
                navigate({ to: "/learn/$chapterId", params: { chapterId } })
              }
            />
          ) : (
            <EmptyState
              icon={<BulbOutlined className="h-5 w-5" />}
              title="暂无薄弱知识点"
              description="继续保持，系统会在你出现错题时自动推荐"
            />
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-base font-semibold">成绩趋势</h2>
          <EmptyState
            icon={<TrophyOutlined className="h-5 w-5" />}
            title="暂无成绩趋势数据"
            description="完成模拟考试后，系统将自动生成趋势图"
          />
        </div>
      </div>
    </SectionPageLayout>
  );
}
