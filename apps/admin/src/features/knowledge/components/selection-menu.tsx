import { Button } from "@/components/ui/button";
import { HighlightOutlined, QuestionCircleOutlined, FileTextOutlined } from "@/components/ui/icons";
import type { SelectionState, DraftAnnotation, AnnotationType } from "../types";

interface SelectionMenuProps {
  x: number;
  y: number;
  savingAnnotation?: boolean;
  onCreateAnnotation: (type: AnnotationType, text: string, selection: SelectionState) => void;
  onDraftChange: (draft: DraftAnnotation | null) => void;
  onClose: () => void;
  getSelection: () => SelectionState | null;
}

export function SelectionMenu({
  x,
  y,
  savingAnnotation,
  onCreateAnnotation,
  onDraftChange,
  onClose,
  getSelection,
}: SelectionMenuProps) {
  const handleAction = (type: AnnotationType) => {
    const state = getSelection();
    if (!state) return;
    if (type === "highlight") {
      onCreateAnnotation("highlight", state.text, state);
      onClose();
      return;
    }
    onDraftChange({ ...state, type, content: "" });
    onClose();
  };

  return (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg"
      style={{ left: x, top: y }}
      role="toolbar"
      aria-label="标注菜单"
    >
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={() => handleAction("highlight")}
        disabled={savingAnnotation}
      >
        <HighlightOutlined /> 高亮
      </Button>
      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleAction("note")}>
        <FileTextOutlined /> 笔记
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={() => handleAction("question")}
      >
        <QuestionCircleOutlined /> 疑问
      </Button>
    </div>
  );
}
