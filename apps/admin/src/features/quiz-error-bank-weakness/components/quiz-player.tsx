import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { apiRequest } from "@/lib/api";
import { OPTION_LABELS, REPORT_TYPES } from "../constants";
import type { Question } from "../types";

interface QuizPlayerProps {
  question: Question;
  onAnswer: (option: string) => void;
  onNext: () => void;
  mode?: "practice" | "exam";
}

export function QuizPlayer({ question, onAnswer, onNext, mode = "practice" }: QuizPlayerProps) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; explanation?: string } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value);
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const handleSelect = (option: string) => {
    if (result) return;
    setAnswer(option);
  };

  const handleSubmit = () => {
    if (!answer) return;
    const correct = answer === question.correctAnswer;
    setResult({ correct, explanation: question.explanation });
    onAnswer(answer);
  };

  const handleNext = () => {
    setAnswer(null);
    setResult(null);
    onNext();
  };

  const handleReset = () => {
    setAnswer(null);
    setResult(null);
  };

  const current = question;

  const submitReport = async () => {
    if (!reportDescription.trim()) return;
    setReportSubmitting(true);
    try {
      await apiRequest<void>("/api/error-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: current.id,
          type: reportType,
          description: reportDescription.trim(),
        }),
      });
      setReportOpen(false);
      setReportDescription("");
      setReportType(REPORT_TYPES[0].value);
    } finally {
      setReportSubmitting(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-lg font-medium">{current.question}</p>
          {current.tags && current.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {current.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="报错"
        >
          <Icon name="Flag" className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        {Object.entries(current.options).map(([key, text], index) => {
          const label = OPTION_LABELS[index] ?? String(index + 1);
          const selected = answer === key;
          const isCorrect = key === current.correctAnswer;
          const showCorrect = result && isCorrect;
          const showWrong = result && selected && !isCorrect;
          return (
            <button
              key={key}
              type="button"
              disabled={!!result}
              onClick={() => handleSelect(key)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                showCorrect
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : showWrong
                    ? "border-red-500 bg-red-50 dark:bg-red-950"
                    : selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="font-semibold">{label}.</span> {text}
            </button>
          );
        })}
      </div>

      {result && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="font-semibold">{result.correct ? "回答正确" : "回答错误"}</p>
          {result.explanation && <p className="mt-2 text-muted-foreground">{result.explanation}</p>}
        </div>
      )}

      <div className="flex gap-3">
        {!result ? (
          <Button onClick={handleSubmit} disabled={!answer}>
            提交答案
          </Button>
        ) : (
          <>
            {mode === "practice" && (
              <Button variant="outline" onClick={handleReset}>
                重置
              </Button>
            )}
            <Button onClick={handleNext}>下一题</Button>
          </>
        )}
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>题目报错</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select
              value={reportType}
              onValueChange={(v) => setReportType(v ?? REPORT_TYPES[0].value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择报错类型" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="请描述问题..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              取消
            </Button>
            <Button onClick={submitReport} disabled={reportSubmitting}>
              提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
