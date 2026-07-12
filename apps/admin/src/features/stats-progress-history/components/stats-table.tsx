import { useMemo } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
import type { ChapterStats, KnowledgePointStats } from "../types";
import type { StatsType } from "../index";

interface StatsTableProps {
  type: StatsType;
  data: ChapterStats[] | KnowledgePointStats[];
}

function accuracyVariant(accuracy: number): "default" | "secondary" | "destructive" | "outline" {
  if (accuracy >= 80) return "default";
  if (accuracy >= 60) return "secondary";
  return "destructive";
}

export function StatsTable({ type, data }: StatsTableProps) {
  const columns = useMemo<ColumnDef<ChapterStats | KnowledgePointStats>[]>(
    () =>
      type === "chapter"
        ? [
            {
              accessorKey: "rank",
              header: "排名",
              cell: ({ getValue }) => {
                const rank = getValue<number | undefined>();
                return rank ? rank : "—";
              },
              size: 72,
            },
            { accessorKey: "chapterName", header: "章节", size: 240 },
            {
              accessorKey: "accuracy",
              header: "正确率",
              cell: ({ getValue }) => {
                const accuracy = getValue<number>();
                return <Badge variant={accuracyVariant(accuracy)}>{accuracy.toFixed(1)}%</Badge>;
              },
              sortingFn: (a, b) => a.original.accuracy - b.original.accuracy,
              size: 120,
            },
            { accessorKey: "total", header: "做题次数", size: 120 },
            { accessorKey: "correct", header: "正确数", size: 120 },
          ]
        : [
            { accessorKey: "knowledgePointName", header: "知识点", size: 240 },
            { accessorKey: "chapterName", header: "章节", size: 180 },
            {
              accessorKey: "accuracy",
              header: "正确率",
              cell: ({ getValue }) => {
                const accuracy = getValue<number>();
                return <Badge variant={accuracyVariant(accuracy)}>{accuracy.toFixed(1)}%</Badge>;
              },
              sortingFn: (a, b) => a.original.accuracy - b.original.accuracy,
              size: 120,
            },
            { accessorKey: "total", header: "做题次数", size: 120 },
            {
              accessorKey: "weak",
              header: "状态",
              cell: ({ getValue }) => {
                const weak = getValue<boolean>();
                return weak ? (
                  <Badge variant="destructive">薄弱</Badge>
                ) : (
                  <Badge variant="default">良好</Badge>
                );
              },
              size: 120,
            },
          ],
    [type],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
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
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                暂无数据
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
