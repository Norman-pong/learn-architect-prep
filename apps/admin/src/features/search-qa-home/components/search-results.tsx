import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTextOutlined } from "@/components/ui/icons";
import type { SearchResult } from "../types";

function buildHighlighted(text: string, terms: string[]): React.ReactNode {
  if (terms.length === 0) return text;
  const termSet = new Set(terms.map((t) => t.toLowerCase()));
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "giu",
  );
  const parts = text.split(pattern);
  return parts.map((part, idx) =>
    termSet.has(part.toLowerCase()) ? (
      <mark
        key={idx}
        className="rounded-sm bg-yellow-200 px-0.5 font-medium text-foreground dark:bg-yellow-700/60"
      >
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

export function SearchResults({
  results,
  query,
  loading,
}: {
  results: SearchResult[];
  query: string;
  loading: boolean;
}) {
  const terms = query.trim().split(/\s+/).filter(Boolean);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileTextOutlined className="mb-3 size-12 opacity-40" />
        <p className="text-sm">未找到匹配的知识点</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((item) => (
        <Card key={item.kpId} className="cursor-pointer transition-shadow hover:shadow-md">
          <CardContent className="space-y-2 p-4">
            <h4 className="text-base font-semibold leading-snug">
              {buildHighlighted(item.title, terms)}
            </h4>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {item.chapterName}
              </span>
              <span className="text-xs text-muted-foreground">{item.chapterId}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {buildHighlighted(item.snippet, terms)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
