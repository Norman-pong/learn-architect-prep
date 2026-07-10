import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChartOutlined,
  BookOpenOutlined,
  BulbOutlined,
  ProjectOutlined,
} from "@/components/ui/icons";
import { useWritingTips, useWritingTipTopics, useWritingTipProjects } from "./api";
import { TipsAccordion } from "./components/tips-accordion";
import type { Topic, HistoricalTopic, MasterProject, TechDecision } from "./types";

function isWordRange(value: unknown): value is { min: number; max: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "min" in value &&
    "max" in value &&
    typeof value.min === "number" &&
    typeof value.max === "number"
  );
}

export function WritingTipsPage() {
  const { data: tips, isLoading: tipsLoading } = useWritingTips();
  const { data: topics, isLoading: topicsLoading } = useWritingTipTopics();
  const { data: projects, isLoading: projectsLoading } = useWritingTipProjects();

  const loading = tipsLoading || topicsLoading || projectsLoading;
  const error = !tips || !topics || !projects;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">数据加载失败，请稍后重试。</p>
        </CardContent>
      </Card>
    );
  }

  const frequencyColor: Record<string, BadgeProps["variant"]> = {
    high: "destructive",
    medium: "default",
    low: "outline",
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BookOpenOutlined className="h-6 w-6 text-primary" />
          写作技巧指导
        </h1>
        <p className="text-muted-foreground">
          系统架构设计师论文考试（4选1，120分钟，2000-3000字）的专项指导和历年题目分析。
        </p>
      </div>

      <TipsAccordion guidelines={tips.guidelines} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChartOutlined className="h-5 w-5" />
              字数分配建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(tips.word_count)
                .filter(([key]) => key !== "total")
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{key}</span>
                    <span className="text-sm text-muted-foreground">
                      {isWordRange(value) ? `${value.min} - ${value.max}` : ""} 字
                    </span>
                  </div>
                ))}
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 bg-muted/30">
                <span className="text-sm font-medium">总计</span>
                <span className="text-sm font-medium">
                  {tips.word_count.total?.min ?? 0} - {tips.word_count.total?.max ?? 0} 字
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BulbOutlined className="h-5 w-5" />
              选题策略
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">四选一快速判断</p>
              <ul className="space-y-1">
                {topics.strategy.quick_judgment.map((item: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">选择原则</p>
              <ul className="space-y-1">
                {topics.strategy.selection_principles.map((item: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">{topics.strategy.preparation_plan}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChartOutlined className="h-5 w-5" />
            历年论文题目汇总（2018-2025）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">阶段趋势</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(topics.periods).map(([period, desc]: [string, string]) => (
                <Badge key={period} variant="secondary">
                  {period}：{desc}
                </Badge>
              ))}
            </div>
          </div>

          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">年份</th>
                  <th className="px-3 py-2 text-left font-medium">场次</th>
                  <th className="px-3 py-2 text-left font-medium">题目</th>
                  <th className="px-3 py-2 text-left font-medium">主题</th>
                  <th className="px-3 py-2 text-left font-medium">频率</th>
                </tr>
              </thead>
              <tbody>
                {topics.topics.map((t: Topic) => (
                  <tr key={`${t.year}-${t.session}`} className="border-t border-border">
                    <td className="px-3 py-2">{t.year}</td>
                    <td className="px-3 py-2">{t.session}</td>
                    <td className="px-3 py-2">{t.title}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{t.theme}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={frequencyColor[t.frequency] ?? "outline"}>
                        {t.frequency}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2018年之前历年题目</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topics.historical_before_2018.map((item: HistoricalTopic) => (
                <div
                  key={item.year}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                >
                  <Badge variant="secondary">{item.year}</Badge>
                  <span className="text-sm">{item.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">高频主题（备考重点）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">排名</th>
                    <th className="px-3 py-2 text-left font-medium">主题</th>
                    <th className="px-3 py-2 text-left font-medium">频率</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.high_frequency_themes.map(
                    (t: { rank: number; theme: string; frequency: string }) => (
                      <tr key={t.rank} className="border-t border-border">
                        <td className="px-3 py-2">{t.rank}</td>
                        <td className="px-3 py-2">{t.theme}</td>
                        <td className="px-3 py-2">
                          <Badge variant={frequencyColor[t.frequency] ?? "outline"}>
                            {t.frequency}
                          </Badge>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ProjectOutlined className="h-5 w-5" />
            母版项目素材
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            建议准备2-3个母版项目，每个项目覆盖5-8个技术决策点。以下三个母版覆盖电商、中台/数据平台、政务/企业系统三大方向。
          </p>
          {projects.projects.map((project: MasterProject) => (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-base">{project.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">行业</p>
                    <p className="text-sm font-medium">{project.industry}</p>
                  </div>
                  <div className="rounded-md border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">规模</p>
                    <p className="text-sm font-medium">{project.scale}</p>
                  </div>
                  <div className="rounded-md border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">角色</p>
                    <p className="text-sm font-medium">{project.role}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">技术决策点</p>
                  <div className="space-y-2">
                    {project.tech_decisions.map((d: TechDecision) => (
                      <div key={d.id} className="rounded-md border border-border px-3 py-2">
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-sm text-muted-foreground">{d.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-border p-3">
                    <p className="mb-2 text-sm font-medium">优化前</p>
                    <div className="space-y-1">
                      {Object.entries(project.quantifiable_metrics.before).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {key}
                          </Badge>
                          <span className="text-sm">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="mb-2 text-sm font-medium">优化后</p>
                    <div className="space-y-1">
                      {Object.entries(project.quantifiable_metrics.after).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">
                            {key}
                          </Badge>
                          <span className="text-sm">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">适用主题</p>
                  <div className="flex flex-wrap gap-2">
                    {project.applicable_themes.map((theme: string) => (
                      <Badge key={theme} variant="outline">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default WritingTipsPage;
