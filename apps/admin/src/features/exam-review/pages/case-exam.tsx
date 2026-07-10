import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  useExamStatus,
  useStartExam,
  useCasePaper,
  useSubmitCaseAnswer,
  usePauseExam,
  useResumeExam,
  useFinishCaseExam,
} from "../api";
import { ExamTimer } from "../components/exam-timer";
import { AnswerSheet } from "../components/answer-sheet";
import { CaseReportView } from "../components/case-report";
import { CASE_CHOOSE_COUNT } from "../constants";
import type { CaseAnswer, CaseReport } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Snapshot {
  selected?: string[];
  answers?: Record<string, CaseAnswer>;
}

export default function CaseExamPage() {
  const navigate = useNavigate();
  const { data: activeExam, isLoading: statusLoading } = useExamStatus();
  const startExam = useStartExam();
  const [examId, setExamId] = useState<string | null>(null);
  const { data: paper } = useCasePaper(examId ?? undefined);
  const submitCaseAnswer = useSubmitCaseAnswer();
  const pauseExam = usePauseExam();
  const resumeExam = useResumeExam();
  const finishCaseExam = useFinishCaseExam();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, CaseAnswer>>({});
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [report, setReport] = useState<CaseReport | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const initializedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (initializedRef.current || statusLoading) return;
    initializedRef.current = true;
    if (activeExam?.examType === "case" && activeExam.status === "in_progress") {
      setExamId(activeExam.id);
      setRemaining(activeExam.remainingTime);
      setIsRunning(true);
      const snapshot = (activeExam.answersSnapshot ?? {}) as Snapshot;
      if (snapshot.selected) setSelected(new Set(snapshot.selected));
      if (snapshot.answers) setAnswers(snapshot.answers);
    } else {
      startExam.mutate(
        { examType: "case", mode: "single" },
        {
          onSuccess: (data) => {
            setExamId(data.id);
            setRemaining(data.remainingTime);
            setIsRunning(true);
          },
          onError: (err) => toast.error(err.message || "启动考试失败"),
        },
      );
    }
  }, [activeExam, statusLoading, startExam]);

  useEffect(() => {
    if (paper && !report) {
      setRemaining((prev) => (prev > 0 ? prev : paper.remainingTime));
    }
  }, [paper, report]);

  useEffect(() => {
    if (isRunning && !isPaused && remaining > 0 && !report) {
      timerRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current);
            timerRef.current = null;
            void handleFinish(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused, report]);

  const snapshot = useMemo<Snapshot>(() => {
    const cleaned: Record<string, CaseAnswer> = {};
    for (const [id, ans] of Object.entries(answers)) {
      cleaned[id] = { answer: ans.answer ?? "", mermaid: ans.mermaid ?? "" };
    }
    return { selected: Array.from(selected), answers: cleaned };
  }, [selected, answers]);

  const selectedCount = selected.size;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => (a.answer ?? "").trim().length > 0).length,
    [answers],
  );

  const toggleQuestion = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < CASE_CHOOSE_COUNT) next.add(id);
      return next;
    });
  };

  const updateAnswer = (questionId: string, field: keyof CaseAnswer, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
    }));
  };

  const submitAnswer = (questionId: string) => {
    if (!examId) return;
    const ans = answers[questionId] ?? { answer: "" };
    submitCaseAnswer.mutate(
      { examId, questionId, answer: ans.answer ?? "", mermaid: ans.mermaid },
      { onError: () => toast.error("答案同步失败，请稍后重试") },
    );
  };

  const syncSnapshot = async () => {
    if (!examId) return;
    await pauseExam.mutateAsync({
      examId,
      remainingTime: Math.max(0, remaining),
      answersSnapshot: snapshot as Record<string, unknown>,
    });
  };

  const handlePause = async () => {
    if (!examId) return;
    setIsPaused(true);
    try {
      await syncSnapshot();
    } catch (err) {
      setIsPaused(false);
      toast.error(err instanceof Error ? err.message : "暂停失败");
    }
  };

  const handleResume = async () => {
    if (!examId) return;
    try {
      await resumeExam.mutateAsync({ examId });
      setIsPaused(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "继续失败");
    }
  };

  const handleFinish = async (auto = false) => {
    if (!examId || report) return;
    if (!auto && selectedCount < CASE_CHOOSE_COUNT) {
      setConfirmOpen(true);
      return;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPaused(true);
    try {
      await syncSnapshot();
      const r = await finishCaseExam.mutateAsync({ examId });
      setReport(r);
      setIsRunning(false);
      setIsPaused(false);
    } catch (err) {
      setIsPaused(false);
      toast.error(err instanceof Error ? err.message : "提交失败");
    }
  };

  const navItems = useMemo(
    () =>
      paper?.questions.map((q, i) => ({
        key: i,
        label: String(i + 1),
        answered: !!answers[q.id]?.answer?.trim(),
      })) ?? [],
    [paper, answers],
  );

  if (report) {
    return <CaseReportView report={report} onBack={() => navigate({ to: "/exam" })} />;
  }

  if (!paper || !examId) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 py-6">
      <div className="flex-1 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">案例分析模拟考</h1>
                <p className="text-sm text-muted-foreground">请从 5 道题中选做 4 道</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ExamTimer remaining={remaining} isRunning={isRunning && !isPaused} />
                {isPaused ? (
                  <Button onClick={handleResume}>继续</Button>
                ) : (
                  <Button variant="outline" onClick={handlePause}>
                    暂停
                  </Button>
                )}
                <Button onClick={() => handleFinish()} disabled={finishCaseExam.isPending}>
                  提交
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                已选 <strong className="text-foreground">{selectedCount}</strong> /{" "}
                {CASE_CHOOSE_COUNT}
              </span>
              <span>
                已作答 <strong className="text-foreground">{answeredCount}</strong> /{" "}
                {CASE_CHOOSE_COUNT}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {paper.questions.map((q, idx) => {
            const isSelected = selected.has(q.id);
            const ans = answers[q.id] ?? { answer: "" };
            return (
              <Card
                key={q.id}
                id={`question-${idx}`}
                className={cn(
                  "transition-colors",
                  isSelected && "border-primary ring-1 ring-primary",
                )}
              >
                <CardContent className="space-y-4 pt-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        checked={isSelected}
                        onChange={() => toggleQuestion(q.id)}
                        disabled={isPaused}
                      />
                      第 {idx + 1} 题
                    </label>
                    <Badge variant="secondary">{q.chapter}</Badge>
                    <Badge
                      variant={
                        q.difficulty === "hard"
                          ? "destructive"
                          : q.difficulty === "medium"
                            ? "default"
                            : "outline"
                      }
                    >
                      {q.difficulty}
                    </Badge>
                  </div>

                  <p className="text-sm leading-relaxed text-foreground">{q.question}</p>

                  {isSelected && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">答题区</label>
                        <Textarea
                          value={ans.answer}
                          onChange={(e) => updateAnswer(q.id, "answer", e.target.value)}
                          onBlur={() => submitAnswer(q.id)}
                          placeholder="在此输入案例分析答案..."
                          rows={8}
                          disabled={isPaused}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Mermaid 图（可选）
                        </label>
                        <Textarea
                          value={ans.mermaid ?? ""}
                          onChange={(e) => updateAnswer(q.id, "mermaid", e.target.value)}
                          onBlur={() => submitAnswer(q.id)}
                          placeholder="在此输入 Mermaid 语法描述架构图..."
                          rows={4}
                          disabled={isPaused}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="sticky bottom-4 z-10 rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isPaused ? (
              <Button onClick={handleResume}>继续</Button>
            ) : (
              <Button variant="outline" onClick={handlePause}>
                暂停
              </Button>
            )}
            <Button onClick={() => handleFinish()} disabled={finishCaseExam.isPending}>
              提交
            </Button>
          </div>
        </div>
      </div>

      <AnswerSheet
        items={navItems}
        currentIndex={currentIndex}
        onSelect={(idx) => {
          setCurrentIndex(idx);
          document
            .getElementById(`question-${idx}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className="hidden lg:block"
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认提交</DialogTitle>
            <DialogDescription>
              你只选了 {selectedCount} 道题，要求选做 {CASE_CHOOSE_COUNT} 道。确定提交吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                void handleFinish(true);
              }}
            >
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
