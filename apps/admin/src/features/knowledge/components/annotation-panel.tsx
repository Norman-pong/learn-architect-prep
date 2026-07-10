import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Textarea } from "../../../components/ui/textarea";
import { Skeleton } from "../../../components/ui/skeleton";
import { DeleteOutlined } from "../../../components/ui/icons";
import { ANNOTATION_META } from "../constants";
import type { Annotation, DraftAnnotation, AnnotationType, SelectionState } from "../types";

interface AnnotationPanelProps {
  annotations: Annotation[];
  draftAnnotation: DraftAnnotation | null;
  loading?: boolean;
  savingAnnotation?: boolean;
  deletingAnnotationId?: string | null;
  onCreateAnnotation: (type: AnnotationType, content: string, selection: SelectionState) => void;
  onDeleteAnnotation: (id: string) => void;
  onDraftChange: (draft: DraftAnnotation | null) => void;
}

export function AnnotationPanel({
  annotations,
  draftAnnotation,
  loading,
  savingAnnotation,
  deletingAnnotationId,
  onCreateAnnotation,
  onDeleteAnnotation,
  onDraftChange,
}: AnnotationPanelProps) {
  const [draftContent, setDraftContent] = useState("");

  const handleSaveDraft = () => {
    if (!draftAnnotation || !draftContent.trim()) return;
    onCreateAnnotation(draftAnnotation.type, draftContent, draftAnnotation);
    setDraftContent("");
  };

  const handleCancelDraft = () => {
    onDraftChange(null);
    setDraftContent("");
  };

  if (loading) {
    return (
      <Card className="w-full shrink-0 md:w-80">
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shrink-0 md:w-80 sticky top-0 self-start">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">本知识点标注</CardTitle>
        <Badge variant="secondary">{annotations.length}</Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        {annotations.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无标注</p>
        ) : (
          annotations.map((annotation) => {
            const meta = ANNOTATION_META[annotation.type];
            return (
              <div key={annotation.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={meta.variant} className={meta.className}>
                      {meta.label}
                    </Badge>
                    {annotation.startOffset !== null && annotation.endOffset !== null && (
                      <span className="text-xs text-muted-foreground">
                        {annotation.startOffset}–{annotation.endOffset}
                      </span>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label="删除标注"
                    disabled={deletingAnnotationId === annotation.id}
                    onClick={() => onDeleteAnnotation(annotation.id)}
                  >
                    <DeleteOutlined />
                  </Button>
                </div>
                {annotation.type === "highlight" ? (
                  <p className="text-sm">{annotation.content}</p>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm">{annotation.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">原文：{annotation.content}</p>
                  </>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      {draftAnnotation && (
        <div
          className="fixed z-50 w-80 rounded-lg border border-border bg-popover p-4 shadow-lg"
          style={{
            left: Math.min(draftAnnotation.x, window.innerWidth - 360),
            top: draftAnnotation.y + 48,
          }}
        >
          <h4 className="mb-2 text-sm font-medium">
            添加{ANNOTATION_META[draftAnnotation.type].label}
          </h4>
          <p className="mb-2 text-xs text-muted-foreground">原文：{draftAnnotation.text}</p>
          <Textarea
            autoFocus
            value={draftContent}
            rows={4}
            placeholder={draftAnnotation.type === "note" ? "写下你的理解或补充" : "记录这里的疑问"}
            onChange={(e) => setDraftContent(e.target.value)}
            className="mb-2"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={handleCancelDraft}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDraft}
              disabled={savingAnnotation || !draftContent.trim()}
            >
              保存
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
