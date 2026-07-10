import { useMemo, useRef } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_TAG } from "../constants";
import type { ExamRecord } from "../types";

interface ExamHistoryTableProps {
  rows: ExamRecord[];
  passScore: number;
  examLabels: Record<string, string>;
  modeLabels: Record<string, string>;
}

function formatStartedAt(iso: string): string {
  return iso.length >= 16 ? iso.slice(0, 16).replace("T", " ") : iso;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}秒`;
  return `${m}分${s}秒`;
}

function scoreVariant(
  score: number,
  passScore: number,
): "default" | "secondary" | "destructive" | "outline" {
  if (score >= passScore) return "default";
  if (score >= passScore - 10) return "secondary";
  return "destructive";
}

export function ExamHistoryTable({
  rows,
  passScore,
  examLabels,
  modeLabels,
}: ExamHistoryTableProps) {
  const columns = useMemo<ColumnDef<ExamRecord>[]>(
    () => [
      {
        accessorKey: "startedAt",
        header: "日期",
        cell: ({ getValue }) => formatStartedAt(getValue<string>()),
        size: 160,
      },
      {
        accessorKey: "examType",
        header: "科目",
        cell: ({ getValue }) => {
          const t = getValue<string>();
          return examLabels[t] ?? t;
        },
        size: 120,
      },
      {
        accessorKey: "mode",
        header: "模式",
        cell: ({ getValue }) => {
          const m = getValue<string>();
          return modeLabels[m] ?? m;
        },
        size: 100,
      },
      {
        accessorKey: "score",
        header: "分数",
        cell: ({ getValue }) => {
          const score = getValue<number | null>();
          if (score == null) return <span className="text-muted-foreground">未交卷</span>;
          return <Badge variant={scoreVariant(score, passScore)}>{score}</Badge>;
        },
        size: 100,
      },
      {
        accessorKey: "duration",
        header: "用时",
        cell: ({ getValue }) => formatDuration(getValue<number>()),
        size: 100,
      },
      {
        accessorKey: "passed",
        header: "合格",
        cell: ({ row, getValue }) => {
          const passed = getValue<boolean | null>();
          if (row.original.status !== "finished" || passed == null) {
            return <Badge variant="outline">—</Badge>;
          }
          return passed ? (
            <Badge variant="default">通过</Badge>
          ) : (
            <Badge variant="destructive">未达</Badge>
          );
        },
        size: 90,
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ getValue }) => {
          const s = getValue<string>();
          const tag = STATUS_TAG[s];
          if (!tag) return <Badge variant="outline">{s}</Badge>;
          return <Badge variant={tag.variant}>{tag.label}</Badge>;
        },
        size: 100,
      },
    ],
    [passScore, examLabels, modeLabels],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const rowModel = table.getRowModel();
  const virtualizer = useVirtualizer({
    count: rowModel.rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 8,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  return (
    <div ref={containerRef} className="relative max-h-[480px] overflow-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  style={{ width: h.getSize() }}
                  className={cn(
                    "cursor-pointer select-none",
                    h.column.getCanSort() && "hover:bg-muted/50",
                  )}
                  onClick={h.column.getToggleSortingHandler()}
                >
                  {h.isPlaceholder ? null : (
                    <>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc"
                        ? " ↑"
                        : h.column.getIsSorted() === "desc"
                          ? " ↓"
                          : ""}
                    </>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rowModel.rows.length ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0">
                <div style={{ height: totalHeight }} className="relative w-full">
                  {virtualRows.map((virtualRow) => {
                    const row = rowModel.rows[virtualRow.index];
                    return (
                      <div
                        key={row.id}
                        className="absolute left-0 flex w-full border-b border-border"
                        style={{ top: virtualRow.start, height: virtualRow.size }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <div
                            key={cell.id}
                            className="flex items-center px-4 py-3 text-sm"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                暂无考试记录
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
