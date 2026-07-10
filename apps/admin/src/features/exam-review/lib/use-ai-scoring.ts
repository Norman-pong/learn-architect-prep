import { useCallback, useEffect, useRef, useState } from "react";
import type { AiScoreEvent } from "../types";

export interface AiScoringState {
  isStreaming: boolean;
  chunks: string[];
  done: boolean;
  error: string | null;
  start: (opts: { writingId: string; onEvent?: (event: AiScoreEvent) => void }) => void;
  stop: () => void;
}

export function useAiScoring(): AiScoringState {
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunks, setChunks] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const start = useCallback(
    (opts: { writingId: string; onEvent?: (event: AiScoreEvent) => void }) => {
      if (esRef.current) esRef.current.close();
      setIsStreaming(true);
      setChunks([]);
      setDone(false);
      setError(null);

      const base = import.meta.env.VITE_API_BASE || "http://localhost:8787";
      const url = new URL(`${base}/api/ai-scoring/essay`);
      url.searchParams.set("writingId", opts.writingId);

      const es = new EventSource(url.toString(), { withCredentials: true });
      esRef.current = es;

      es.addEventListener("chunk", (e) => {
        const data = (e as MessageEvent).data as string;
        setChunks((prev) => [...prev, data]);
        opts.onEvent?.({ type: "chunk", data });
      });

      es.addEventListener("done", (e) => {
        let payload: unknown;
        try {
          payload = JSON.parse((e as MessageEvent).data);
        } catch {
          payload = (e as MessageEvent).data;
        }
        setDone(true);
        setIsStreaming(false);
        opts.onEvent?.({ type: "done", data: payload });
        es.close();
      });

      es.addEventListener("error", (e) => {
        const msg = (e as MessageEvent).data || "AI 评分连接出错";
        setError(msg);
        setIsStreaming(false);
        opts.onEvent?.({ type: "error", message: msg });
        es.close();
      });
    },
    [],
  );

  const stop = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  return { isStreaming, chunks, done, error, start, stop };
}
