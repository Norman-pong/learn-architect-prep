import { useEffect, useState } from "react";
import { listAnnotations, type Annotation } from "@/lib/annotations-api";

export function useAnnotations(knowledgePointId: string | undefined) {
  const [annotations, setAnnotations] = useState<Annotation[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!knowledgePointId) {
      setAnnotations(undefined);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    listAnnotations(knowledgePointId)
      .then((data) => {
        if (!cancelled) setAnnotations(data);
      })
      .catch(() => {
        if (!cancelled) setAnnotations(undefined);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [knowledgePointId]);

  return { annotations, isLoading };
}
