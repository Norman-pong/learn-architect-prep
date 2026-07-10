import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import type { ChapterMeta, ChapterIndex, TreeNode } from "../types";

interface ChapterTreeProps {
  chapters: ChapterMeta[];
  chapterIndexMap: Record<string, ChapterIndex>;
  chapterId?: string;
  kpId?: string;
  loading?: boolean;
}

function WeightBadge({ weight }: { weight?: number }) {
  if (weight === undefined || weight === null) return null;
  const variants: Record<number, string> = {
    5: "bg-destructive text-destructive-foreground",
    4: "bg-warning text-warning-foreground",
    3: "bg-primary text-primary-foreground",
    2: "bg-secondary text-secondary-foreground",
    1: "bg-secondary text-secondary-foreground",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "ml-1.5 h-4 min-w-[1.25rem] px-1 text-[10px] leading-4",
        variants[weight] ?? variants[1],
      )}
    >
      {weight}
    </Badge>
  );
}

export function ChapterTree({
  chapters,
  chapterIndexMap,
  chapterId,
  kpId,
  loading,
}: ChapterTreeProps) {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const sections: Record<string, TreeNode> = {};
    for (const ch of chapters) {
      const section = ch.section || "未分类";
      if (!sections[section]) {
        sections[section] = { key: `section-${section}`, title: section, children: [] };
      }
      const details = chapterIndexMap[ch.id];
      const children =
        details?.knowledgePoints.map((kp) => ({
          key: `${ch.id}/${kp.id}`,
          title: kp.title,
          weight: kp.examWeight,
        })) ?? [];
      sections[section].children!.push({
        key: ch.id,
        title: ch.title,
        weight: ch.examWeight,
        children,
      });
    }
    return Object.values(sections).toSorted((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }, [chapters, chapterIndexMap]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleChapter = useCallback((key: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (chapterKey: string, kpKey?: string) => {
      if (kpKey) {
        void navigate({
          to: "/learn/$chapterId",
          params: { chapterId: chapterKey },
          search: { kpId: kpKey },
        });
      } else {
        void navigate({ to: "/learn/$chapterId", params: { chapterId: chapterKey } });
      }
    },
    [navigate],
  );

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div className="select-none p-3 text-sm">
      <h3 className="mb-3 px-1 text-sm font-semibold text-foreground">知识体系</h3>
      <div className="space-y-1">
        {treeData.map((section) => {
          const sectionOpen = expandedSections.has(section.key) || !!chapterId;
          return (
            <div key={section.key}>
              <button
                className="flex w-full items-center gap-1 rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => toggleSection(section.key)}
              >
                <span className="inline-block w-3.5 transition-transform">
                  {sectionOpen ? "▼" : "▶"}
                </span>
                {section.title}
              </button>
              {sectionOpen && (
                <div className="ml-3 space-y-0.5 border-l border-border pl-2">
                  {section.children?.map((ch) => {
                    const chapterOpen = expandedChapters.has(ch.key) || chapterId === ch.key;
                    const isActiveChapter = chapterId === ch.key;
                    return (
                      <div key={ch.key}>
                        <button
                          className={cn(
                            "flex w-full items-center gap-1 rounded-md px-1 py-1 text-sm hover:bg-accent hover:text-accent-foreground",
                            isActiveChapter && "bg-accent text-accent-foreground",
                          )}
                          onClick={() => {
                            toggleChapter(ch.key);
                            if (!ch.children?.length) handleSelect(ch.key);
                          }}
                        >
                          <span className="inline-block w-3.5 transition-transform">
                            {ch.children?.length ? (chapterOpen ? "▼" : "▶") : "•"}
                          </span>
                          <span className="truncate">{ch.title}</span>
                          <WeightBadge weight={ch.weight} />
                        </button>
                        {chapterOpen && (
                          <div className="ml-5 space-y-0.5">
                            {ch.children?.map((kp) => {
                              const isActive = kpId === kp.key.split("/")[1];
                              return (
                                <button
                                  key={kp.key}
                                  className={cn(
                                    "flex w-full items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground",
                                    isActive && "bg-primary/10 text-primary font-medium",
                                  )}
                                  onClick={() => handleSelect(ch.key, kp.key.split("/")[1])}
                                >
                                  <span className="truncate">{kp.title}</span>
                                  <WeightBadge weight={kp.weight} />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
