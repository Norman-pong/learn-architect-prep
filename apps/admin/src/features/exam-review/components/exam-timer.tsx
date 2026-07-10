import { useEffect, useRef } from "react";
import { formatSeconds } from "../constants";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  remaining: number;
  isRunning: boolean;
  onTimeUp?: () => void;
  className?: string;
}

export function ExamTimer({ remaining, isRunning, onTimeUp, className }: ExamTimerProps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (isRunning && remaining > 0) {
      timerRef.current = setInterval(() => {
        // Timer is driven by parent state; this is a heartbeat for auto-finish
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, remaining]);

  const urgent = remaining < 300;
  const warning = remaining < 600;

  return (
    <div className={cn("flex items-center gap-2 font-mono text-lg", className)}>
      <span className="text-muted-foreground text-sm">剩余时间</span>
      <span
        className={cn(
          "tabular-nums font-semibold",
          urgent && "text-destructive animate-pulse",
          warning && !urgent && "text-amber-500",
        )}
      >
        {formatSeconds(remaining)}
      </span>
    </div>
  );
}
