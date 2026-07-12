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
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    key: "streakDays" as const,
    label: "连续学习",
    suffix: "天",
    icon: BarChartOutlined,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    key: "weakPointCount" as const,
    label: "薄弱点预警",
    suffix: "",
    icon: WarningOutlined,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    key: "lastMockScore" as const,
    label: "上次模考",
    suffix: "分",
    icon: TrophyOutlined,
    color: "text-success",
    bg: "bg-success/10",
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
