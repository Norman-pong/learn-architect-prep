import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BookOutlined,
  BarChartOutlined,
  WarningOutlined,
  TrophyOutlined,
} from "@/components/ui/icons";
import type { DashboardData } from "../types";

const stats = [
  {
    key: "todayReviewCount" as const,
    label: "今日复习",
    suffix: "",
    icon: BookOutlined,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    key: "streakDays" as const,
    label: "连续学习",
    suffix: "天",
    icon: BarChartOutlined,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
  },
  {
    key: "weakPointCount" as const,
    label: "薄弱点预警",
    suffix: "",
    icon: WarningOutlined,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
  },
  {
    key: "lastMockScore" as const,
    label: "上次模考",
    suffix: "分",
    icon: TrophyOutlined,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
];

export function DashboardCards({ data, loading }: { data: DashboardData; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => {
        const raw = data[s.key];
        const value = raw == null ? "--" : raw;
        return (
          <Card key={s.key}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", s.bg)}>
                <s.icon className="size-[22px]" />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight">
                  {value}
                  {value !== "--" ? s.suffix : ""}
                </div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
