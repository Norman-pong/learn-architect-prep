import * as React from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAICostSummary, useFeatureUsage } from "../api";
import { featureLabel, providerBadgeVariant } from "../constants";
import type { FeatureUsage, AICostSummary } from "../types";

function SummaryCards({ summary, loading }: { summary?: AICostSummary; loading: boolean }) {
  const periods = [
    { key: "today" as const, label: "今日", subLabel: "24h" },
    { key: "thisWeek" as const, label: "本周", subLabel: "7d" },
    { key: "total" as const, label: "累计", subLabel: "全部" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {periods.map(({ key, label, subLabel }) => {
        const data = summary?.[key];
        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label} Token 消耗
                <span className="ml-2 text-xs text-muted-foreground/60">{subLabel}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {(data?.inputTokens ?? 0).toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / {(data?.outputTokens ?? 0).toLocaleString()} 输出
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${(data?.costEstimate ?? 0).toFixed(6)} USD
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CostDashboard() {
  const { data: summary, isLoading: summaryLoading } = useAICostSummary();
  const { data: stats, isLoading: statsLoading } = useFeatureUsage();
  const [providerFilter, setProviderFilter] = React.useState<string>("all");

  const providers = React.useMemo(
    () => Array.from(new Set((stats ?? []).map((s) => s.provider))),
    [stats],
  );

  const filtered = React.useMemo(() => {
    if (!stats) return [];
    if (providerFilter === "all") return stats;
    return stats.filter((s) => s.provider === providerFilter);
  }, [stats, providerFilter]);

  const totalRow = React.useMemo(
    () => ({
      feature: "合计",
      provider: "-",
      model: "-",
      calls: filtered.reduce((sum, s) => sum + s.calls, 0),
      inputTokens: filtered.reduce((sum, s) => sum + s.inputTokens, 0),
      outputTokens: filtered.reduce((sum, s) => sum + s.outputTokens, 0),
      costEstimate: filtered.reduce((sum, s) => sum + s.costEstimate, 0),
    }),
    [filtered],
  );

  const tableData = filtered.length > 0 ? [...filtered, totalRow] : [];

  const columns = React.useMemo<ColumnDef<FeatureUsage | typeof totalRow>[]>(
    () => [
      {
        accessorKey: "feature",
        header: "功能",
        cell: ({ row }) => {
          const value = row.getValue("feature") as string;
          if (value === "合计") return <span className="font-medium">{value}</span>;
          return featureLabel(value);
        },
      },
      {
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => {
          const value = row.getValue("provider") as string;
          if (value === "-") return <span className="text-muted-foreground">-</span>;
          return <Badge variant={providerBadgeVariant(value)}>{value}</Badge>;
        },
      },
      {
        accessorKey: "model",
        header: "模型",
        cell: ({ row }) => {
          const value = row.getValue("model") as string;
          if (value === "-") return <span className="text-muted-foreground">-</span>;
          return value;
        },
      },
      {
        accessorKey: "calls",
        header: "调用次数",
        cell: ({ row }) => (row.getValue("calls") as number).toLocaleString(),
      },
      {
        accessorKey: "inputTokens",
        header: "输入 tokens",
        cell: ({ row }) => (row.getValue("inputTokens") as number).toLocaleString(),
      },
      {
        accessorKey: "outputTokens",
        header: "输出 tokens",
        cell: ({ row }) => (row.getValue("outputTokens") as number).toLocaleString(),
      },
      {
        accessorKey: "costEstimate",
        header: "估算费用 (USD)",
        cell: ({ row }) => {
          const value = row.getValue("costEstimate") as number;
          return `$${value.toFixed(6)}`;
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tableData as FeatureUsage[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const loading = summaryLoading || statsLoading;

  return (
    <div className="space-y-6">
      <SummaryCards summary={summary} loading={summaryLoading} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-medium">按功能分类</CardTitle>
          <Select value={providerFilter} onValueChange={(v) => setProviderFilter(v ?? "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部 provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部 provider</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : tableData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无 AI 调用记录</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={
                        row.original.feature === "合计" ? "bg-muted/50 font-medium" : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
