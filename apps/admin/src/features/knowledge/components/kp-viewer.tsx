import { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { useTextSelection } from "../lib/use-text-selection";
import { SelectionMenu } from "./selection-menu";
import type { KnowledgePoint, SelectionState, DraftAnnotation, AnnotationType } from "../types";

interface KpViewerProps {
  chapterId?: string;
  kpId?: string;
  knowledgePoint: KnowledgePoint | null;
  content: string;
  loading?: boolean;
  onDraftChange: (draft: DraftAnnotation | null) => void;
  onCreateAnnotation: (type: AnnotationType, text: string, selection: SelectionState) => void;
  savingAnnotation?: boolean;
}

export function KpViewer({
  chapterId,
  kpId,
  knowledgePoint,
  content,
  loading,
  onDraftChange,
  onCreateAnnotation,
  savingAnnotation,
}: KpViewerProps) {
  const navigate = useNavigate();
  const { contentRef, menuPos, handleTextSelection, clearSelection, readSelection } =
    useTextSelection(content, kpId, onDraftChange);

  const handleCloseMenu = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    clearSelection();
  }, [clearSelection]);

  const handleMenuAction = useCallback(
    (type: AnnotationType, text: string, selection: SelectionState) => {
      onCreateAnnotation(type, text, selection);
      clearSelection();
    },
    [onCreateAnnotation, clearSelection],
  );

  if (loading) {
    return (
      <Card className="flex-1">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="flex-1 min-w-0">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">{knowledgePoint?.title ?? "知识点详情"}</CardTitle>
          {knowledgePoint && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void navigate({
                    to: "/learn/$chapterId/$kpId/qa",
                    params: { chapterId: chapterId ?? "", kpId: knowledgePoint.id },
                  })
                }
              >
                AI 答疑
              </Button>
              {knowledgePoint.examWeight > 0 && (
                <Badge variant="outline">权重 {knowledgePoint.examWeight}</Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            选中文本后，可添加高亮、笔记或疑问；标注会同步到复习卡片。
          </p>
          <div
            ref={contentRef}
            role="article"
            tabIndex={0}
            aria-label="知识点正文，选中文本后可添加标注"
            onMouseUp={handleTextSelection}
            onKeyUp={handleTextSelection}
            className="prose prose-sm max-w-none outline-none dark:prose-invert"
          >
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">请从左侧选择一个知识点查看详情。</p>
            )}
          </div>
        </CardContent>
      </Card>

      {menuPos && (
        <SelectionMenu
          x={menuPos.x}
          y={menuPos.y}
          savingAnnotation={savingAnnotation}
          onCreateAnnotation={handleMenuAction}
          onDraftChange={onDraftChange}
          onClose={handleCloseMenu}
          getSelection={readSelection}
        />
      )}
    </>
  );
}
