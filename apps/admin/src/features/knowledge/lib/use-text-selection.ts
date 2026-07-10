import { useRef, useCallback, useState } from "react";
import type { SelectionState, DraftAnnotation } from "../types";

export function useTextSelection(
  content: string,
  kpId: string | undefined,
  onDraftChange: (draft: DraftAnnotation | null) => void,
) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setMenuPos(null);
  }, []);

  const readSelection = useCallback((): SelectionState | null => {
    const container = contentRef.current;
    if (!container || !content || !kpId) return null;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return null;
    const selectedText = selection.toString();
    if (!selectedText.trim()) return null;
    const beforeSelection = document.createRange();
    beforeSelection.selectNodeContents(container);
    beforeSelection.setEnd(range.startContainer, range.startOffset);
    const startOffset = beforeSelection.toString().length;
    const endOffset = startOffset + selectedText.length;
    if (endOffset <= startOffset || endOffset > content.length) return null;
    const rect = range.getBoundingClientRect();
    const x = Math.min(Math.max(16, rect.left + rect.width / 2 - 116), window.innerWidth - 248);
    const y = Math.max(16, rect.top - 56);
    return { text: selectedText, startOffset, endOffset, x, y };
  }, [content, kpId]);

  const handleTextSelection = useCallback(() => {
    const state = readSelection();
    if (!state) {
      setMenuPos(null);
      onDraftChange(null);
      return;
    }
    onDraftChange(null);
    setMenuPos({ x: state.x, y: state.y });
  }, [readSelection, onDraftChange]);

  return {
    contentRef,
    menuPos,
    clearSelection,
    handleTextSelection,
    readSelection,
  };
}
