import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { MenuOutlined } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SectionPageLayout } from "@/components/layout";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  useChapters,
  useChapterIndex,
  useKnowledgePoint,
  useAnnotations,
  useCreateAnnotation,
  useDeleteAnnotation,
} from "./api";
import { ChapterTree } from "./components/chapter-tree";
import { KpViewer } from "./components/kp-viewer";
import { AnnotationPanel } from "./components/annotation-panel";
import type { DraftAnnotation, AnnotationType, SelectionState } from "./types";

export function KnowledgePage() {
  const params = useParams({ strict: false });
  const chapterId = params.chapterId as string | undefined;
  const search = useSearch({ strict: false, select: (s) => s as { kpId?: string } });
  const kpId = search.kpId;

  const { data: chaptersData, isLoading: loadingChapters } = useChapters();
  const chapters = chaptersData?.chapters ?? [];
  const { data: chapterIndex } = useChapterIndex(chapterId);
  const { data: content = "", isLoading: loadingContent } = useKnowledgePoint(chapterId, kpId);
  const { data: annotations = [], isLoading: loadingAnnotations } = useAnnotations(kpId);
  const createMutation = useCreateAnnotation();
  const deleteMutation = useDeleteAnnotation();

  const [chapterMap, setChapterMap] = useState<Record<string, NonNullable<typeof chapterIndex>>>(
    {},
  );
  const [draftAnnotation, setDraftAnnotation] = useState<DraftAnnotation | null>(null);

  useEffect(() => {
    if (!chapterId || !chapterIndex) return;
    setChapterMap((prev) => ({ ...prev, [chapterId]: chapterIndex }));
  }, [chapterIndex, chapterId]);
  const effectiveChapterMap = chapterMap;
  const currentKnowledgePoint = useMemo(() => {
    if (!chapterId || !kpId) return undefined;
    const index = effectiveChapterMap[chapterId];
    if (!index) return undefined;
    return index.knowledgePoints.find((p) => p.id === kpId);
  }, [chapterId, kpId, effectiveChapterMap]);

  const handleCreateAnnotation = useCallback(
    (type: AnnotationType, annotationContent: string, selection: SelectionState) => {
      if (!kpId) {
        toast.error("请先选择知识点");
        return;
      }
      createMutation.mutate(
        {
          knowledgePointId: kpId,
          type,
          content: annotationContent,
          selectionText: selection.text,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
        },
        {
          onSuccess: () => {
            setDraftAnnotation(null);
          },
        },
      );
    },
    [kpId, createMutation],
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  return (
    <SectionPageLayout
      title="知识体系"
      description="按章节组织的教材知识点"
      className="flex h-[calc(100vh-3.5rem)] flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border md:flex-row">
        <ChapterTreeDrawer
          chapters={chapters}
          chapterIndexMap={effectiveChapterMap}
          chapterId={chapterId}
          kpId={kpId}
          loading={loadingChapters}
        />

        <main className="flex flex-1 min-w-0 flex-col gap-3 overflow-y-auto p-2 sm:gap-4 sm:p-3 md:flex-row md:p-4">
          <KpViewer
            chapterId={chapterId}
            kpId={kpId}
            knowledgePoint={currentKnowledgePoint}
            content={content}
            loading={loadingContent}
            onDraftChange={setDraftAnnotation}
            onCreateAnnotation={handleCreateAnnotation}
            savingAnnotation={createMutation.isPending}
          />

          {kpId && (
            <AnnotationPanel
              annotations={annotations}
              draftAnnotation={draftAnnotation}
              loading={loadingAnnotations}
              savingAnnotation={createMutation.isPending}
              deletingAnnotationId={deleteMutation.variables ?? null}
              onCreateAnnotation={handleCreateAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              onDraftChange={setDraftAnnotation}
            />
          )}
        </main>
      </div>
    </SectionPageLayout>
  );
}

function ChapterTreeDrawer({
  chapters,
  chapterIndexMap,
  chapterId,
  kpId,
  loading,
}: {
  chapters: Parameters<typeof ChapterTree>[0]["chapters"];
  chapterIndexMap: Record<
    string,
    NonNullable<Parameters<typeof ChapterTree>[0]["chapterIndexMap"]>[string]
  >;
  chapterId?: string;
  kpId?: string;
  loading?: boolean;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  if (!isMobile) {
    return (
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-border bg-sidebar md:block">
        <ChapterTree
          chapters={chapters}
          chapterIndexMap={chapterIndexMap}
          chapterId={chapterId}
          kpId={kpId}
          loading={loading}
        />
      </aside>
    );
  }
  return (
    <div className="flex items-center gap-2 border-b border-border bg-sidebar p-2">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <MenuOutlined className="h-4 w-4" />
            章节
          </Button>
        </DrawerTrigger>
        <DrawerContent side="left" className="w-72">
          <DrawerHeader className="sr-only">
            <DrawerTitle>知识体系</DrawerTitle>
          </DrawerHeader>
          <ChapterTree
            chapters={chapters}
            chapterIndexMap={chapterIndexMap}
            chapterId={chapterId}
            kpId={kpId}
            loading={loading}
          />
        </DrawerContent>
      </Drawer>
      <span className="truncate text-sm font-medium">{chapterId ? "当前章节" : "请选择章节"}</span>
    </div>
  );
}
