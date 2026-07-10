import { SectionPageLayout } from "@/components/layout";
import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeftOutlined,
  ChevronRightOutlined,
  DatabaseOutlined,
  CloudDownloadOutlined,
  HashOutlined,
} from "@/components/ui/icons";
import {
  useQuizBankStats,
  useQuizBankSources,
  useQuizBankQuestions,
  useImportQuizBank,
} from "../api";
import { DIFFICULTY_TAG } from "../constants";
import type { QuizBankQuestion } from "../types";

export function QuizBankTable() {
  const [filters, setFilters] = useState({
    chapter: "",
    difficulty: "",
    source: "",
    year: "",
  });
  const [importUrl, setImportUrl] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: stats, isLoading: statsLoading } = useQuizBankStats();
  const { data: sources = [], isLoading: sourcesLoading } = useQuizBankSources();
  const { data: questions = [], isLoading: questionsLoading } = useQuizBankQuestions(filters);
  const importMutation = useImportQuizBank();

  const columns = useMemo<ColumnDef<QuizBankQuestion>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <HashOutlined className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-xs">{row.original.id.slice(0, 12)}</span>
          </div>
        ),
      },
      {
        accessorKey: "question",
        header: "题目",
        cell: ({ row }) => <div className="max-w-md truncate text-sm">{row.original.question}</div>,
      },
      {
        accessorKey: "chapter",
        header: "章节",
        cell: ({ getValue }) => <Badge variant="outline">{getValue() as string}</Badge>,
      },
      {
        accessorKey: "difficulty",
        header: "难度",
        cell: ({ getValue }) => {
          const d = getValue() as string;
          return d ? <Badge variant="secondary">{DIFFICULTY_TAG[d] || d}</Badge> : null;
        },
      },
      {
        accessorKey: "source",
        header: "来源",
      },
      {
        accessorKey: "year",
        header: "年份",
        cell: ({ getValue }) => (getValue() as number | null) ?? "-",
      },
      {
        accessorKey: "answer",
        header: "答案",
      },
    ],
    [],
  );

  const table = useReactTable({
    data: questions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value === "all" ? "" : value }));
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SectionPageLayout title="题库管理" description="题库导入、筛选与预览">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总题数</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.total ?? 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">覆盖章节</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.byChapter.length ?? 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">来源数</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold">{stats?.bySource.length ?? 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">按章节分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats?.byChapter.map(({ chapter, count }) => (
                  <Badge key={chapter} variant="secondary">
                    {chapter}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">按来源分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sourcesLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  sources.map(({ source, count }) => (
                    <Badge key={source} variant="secondary">
                      {source}: {count}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CloudDownloadOutlined className="h-4 w-4" />
              远程题库导入
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="https://example.com/questions.json"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="h-11 flex-1 sm:h-10"
              />
              <Button
                onClick={() => {
                  if (!importUrl.trim()) return;
                  importMutation.mutate(importUrl.trim(), { onSuccess: () => setImportUrl("") });
                }}
                disabled={!importUrl.trim() || importMutation.isPending}
                className="w-full sm:w-auto"
              >
                <CloudDownloadOutlined className="h-4 w-4 mr-1" />
                {importMutation.isPending ? "导入中..." : "导入"}
              </Button>
            </div>

            {importMutation.data && (
              <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
                <div className="flex items-center gap-2">
                  结果：
                  {importMutation.data.ok ? (
                    <Badge variant="secondary">成功</Badge>
                  ) : (
                    <Badge variant="destructive">失败</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">新增 {importMutation.data.added}</Badge>
                  <Badge variant="secondary">跳过 {importMutation.data.skipped}</Badge>
                  <Badge variant="destructive">失败 {importMutation.data.failed}</Badge>
                </div>
                {importMutation.data.errors && importMutation.data.errors.length > 0 && (
                  <div className="text-red-600">
                    错误：{importMutation.data.errors[0].reason}
                    {importMutation.data.errors.length > 1 &&
                      ` 等 ${importMutation.data.errors.length} 项`}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DatabaseOutlined className="h-4 w-4" />
              题目列表
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.chapter || "all"}
                onValueChange={(v) => handleFilterChange("chapter", v ?? "all")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="章节" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部章节</SelectItem>
                  {Array.from({ length: 20 }, (_, i) => String(i + 1)).map((c) => (
                    <SelectItem key={c} value={c}>
                      第 {c} 章
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.difficulty || "all"}
                onValueChange={(v) => handleFilterChange("difficulty", v ?? "all")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部难度</SelectItem>
                  <SelectItem value="easy">易</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="hard">难</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.source || "all"}
                onValueChange={(v) => handleFilterChange("source", v ?? "all")}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="来源" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部来源</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.source} value={s.source}>
                      {s.source} ({s.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="年份"
                value={filters.year}
                onChange={(e) => handleFilterChange("year", e.target.value || "")}
                className="w-28"
              />
            </div>

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
                  {questionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-32 text-center text-muted-foreground"
                      >
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <>
                        <TableRow
                          key={row.id}
                          onClick={() => toggleExpanded(row.original.id)}
                          className="cursor-pointer"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                        {expanded[row.original.id] && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={columns.length}>
                              <div className="space-y-2 p-2">
                                <div className="text-sm font-medium">选项：</div>
                                {Object.entries(row.original.options).map(([k, v]) => (
                                  <div key={k} className="text-sm">
                                    {k}. {v}
                                  </div>
                                ))}
                                {row.original.explanation && (
                                  <div className="text-sm text-muted-foreground">
                                    解析：{row.original.explanation}
                                  </div>
                                )}
                                {row.original.hash && (
                                  <div className="text-xs text-muted-foreground">
                                    hash: {row.original.hash.slice(0, 16)}…
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                共 {questions.length} 条记录，第 {table.getState().pagination.pageIndex + 1} /{" "}
                {table.getPageCount()} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeftOutlined className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRightOutlined className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SectionPageLayout>
  );
}
