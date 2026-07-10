import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpenOutlined,
  EyeOutlined,
  FilterOutlined,
  SearchOutlined,
} from "@/components/ui/icons";
import type { Sample } from "../types";
const ANNOTATION_LABELS: Record<
  string,
  { label: string; color: "default" | "secondary" | "destructive" | "outline" }
> = {
  decision: { label: "技术决策点", color: "default" },
  compare: { label: "对比分析", color: "secondary" },
  reflection: { label: "反思", color: "destructive" },
};

function parseAnnotations(raw: string) {
  const anns: { type: keyof typeof ANNOTATION_LABELS; text: string }[] = [];
  const re = /<!--\s*(decision|compare|reflection)\s*:\s*([\s\S]*?)-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    anns.push({ type: m[1] as keyof typeof ANNOTATION_LABELS, text: m[2].trim() });
  }
  return anns;
}

function stripComments(raw: string) {
  return raw.replace(/<!--[\s\S]*?-->/g, "");
}

interface SampleViewerProps {
  samples: Sample[];
  activeId: string | null;
  activeContent: string | null;
  loading: boolean;
  loadingContent: boolean;
  onSelect: (id: string) => void;
}

export function SampleViewer({
  samples,
  activeId,
  activeContent,
  loading,
  loadingContent,
  onSelect,
}: SampleViewerProps) {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  const topics = [...new Set(samples.map((s) => s.topic))].toSorted();

  const filtered = samples.filter((s) => {
    if (topicFilter && s.topic !== topicFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return s.title.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
  });

  const activeSample = samples.find((s) => s.id === activeId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpenOutlined className="h-5 w-5" />
            范文库
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            覆盖系统架构设计师考试 10 大高频主题范文，每篇标注技术决策点、数字量化、对比分析与反思。
          </p>
          <Tabs
            value={topicFilter ?? "all"}
            onValueChange={(v) => setTopicFilter(v === "all" ? null : v)}
          >
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">全部主题</TabsTrigger>
              {topics.map((t) => (
                <TabsTrigger key={t} value={t}>
                  <FilterOutlined className="h-3 w-3 mr-1" />
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative">
            <SearchOutlined className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索范文标题或标签…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="h-[calc(100vh-380px)] min-h-[400px]">
          <CardHeader>
            <CardTitle className="text-sm">
              {loading ? "范文列表（加载中…）" : `范文列表（${filtered.length} 篇）`}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-auto pb-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">没有匹配的范文</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      activeId === item.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {item.title.length > 30 ? item.title.slice(0, 30) + "…" : item.title}
                      </span>
                      {activeId === item.id && <EyeOutlined className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {item.topic}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.difficulty} 星
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.word_count} 字
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.year}
                      </Badge>
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle className="text-lg">
              {activeSample ? activeSample.title : "范文详情"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingContent ? (
              <div className="space-y-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
              </div>
            ) : activeContent ? (
              <div className="max-w-3xl">
                {parseAnnotations(activeContent).length > 0 && (
                  <div className="mb-6 space-y-2">
                    {parseAnnotations(activeContent).map((ann, i) => {
                      const meta = ANNOTATION_LABELS[ann.type];
                      return (
                        <div
                          key={i}
                          className="rounded-md border-l-4 border-l-primary bg-muted/50 p-3"
                        >
                          <Badge variant={meta.color} className="mb-1">
                            [{meta.label}]
                          </Badge>
                          <p className="whitespace-pre-wrap text-sm text-foreground">{ann.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <MarkdownRenderer content={stripComments(activeContent)} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                从左侧列表选择一篇范文，查看全文及标注点评。
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
