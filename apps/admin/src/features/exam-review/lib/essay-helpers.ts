import * as React from "react";
import { countWords } from "@/lib/word-count";

import type { ThesisSectionKey } from "@archprep/shared";
import type { ThesisSections } from "@archprep/shared";

export { countWords } from "@/lib/word-count";

export function countTotalSections(sections: ThesisSections): number {
  let total = 0;
  for (const key of Object.keys(sections) as ThesisSectionKey[]) {
    total += countWords(sections[key]);
  }
  return total;
}

export function useAutoSaveState(
  sections: ThesisSections,
  onSave?: (sections: ThesisSections) => void | Promise<void>,
  debounceMs = 2000,
) {
  const [saveState, setSaveState] = React.useState<"saved" | "saving" | "unsaved">("saved");
  const lastSavedRef = React.useRef<ThesisSections>(sections);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const hasChanged = JSON.stringify(lastSavedRef.current) !== JSON.stringify(sections);
    if (!hasChanged) return;

    setSaveState("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await onSave?.(sections);
        lastSavedRef.current = sections;
        setSaveState("saved");
      } catch {
        setSaveState("unsaved");
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sections, onSave, debounceMs]);

  return saveState;
}
