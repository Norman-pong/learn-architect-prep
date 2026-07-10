import { useState, useMemo, useCallback } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
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

  const { data: chapters = [], isLoading: loadingChapters } = useChapters();
  const { data: chapterIndex } = useChapterIndex(chapterId);
  const { data: content = "", isLoading: loadingContent } = useKnowledgePoint(chapterId, kpId);
  const { data: annotations = [], isLoading: loadingAnnotations } = useAnnotations(kpId);
  const createMutation = useCreateAnnotation();
  const deleteMutation = useDeleteAnnotation();

  const [chapterMap, setChapterMap] = useState<Record<string, NonNullable<typeof chapterIndex>>>(
    {},
  );
  const [draftAnnotation, setDraftAnnotation] = useState<DraftAnnotation | null>(null);

  const effectiveChapterMap = useMemo(() => {
    if (chapterIndex && chapterId) {
      setChapterMap((prev) => ({ ...prev, [chapterId]: chapterIndex }));
    }
    return chapterMap;
  }, [chapterIndex, chapterId, chapterMap]);

  const currentKnowledgePoint = useMemo(() => {
    if (!chapterId || !kpId) return null;
    return effectiveChapterMap[chapterId]?.knowledgePoints.find((kp) => kp.id === kpId) ?? null;
  }, [chapterId, kpId, effectiveChapterMap]);

  const handleCreateAnnotation = useCallback(
    (type: AnnotationType, annotationContent: string, selection: SelectionState) => {
      if (!kpId) return;
      const trimmed = annotationContent.trim();
      if (!trimmed) {
        toast.warning(type === "highlight" ? "请选择要高亮的文本" : "请先填写标注内容");
        return;
      }
      const fullContent = type === "highlight" ? trimmed : `「${selection.text}」\n${trimmed}`;
      createMutation.mutate(
        {
          knowledgePointId: kpId,
          type,
          content: fullContent,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
        },
        {
          onSuccess: () => {
            toast.success("标注已保存");
            setDraftAnnotation(null);
            window.getSelection()?.removeAllRanges();
          },
        },
      );
    },
    [kpId, createMutation],
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("标注已删除"),
      });
    },
    [deleteMutation],
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-sidebar">
        <ChapterTree
          chapters={chapters}
          chapterIndexMap={effectiveChapterMap}
          chapterId={chapterId}
          kpId={kpId}
          loading={loadingChapters}
        />
      </aside>

      <main className="flex flex-1 gap-4 overflow-y-auto p-4">
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
  );
}
