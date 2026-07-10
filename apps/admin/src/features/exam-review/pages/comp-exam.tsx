import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useExamStatus,
  useStartExam,
  useCompPaper,
  useSubmitCompAnswer,
  useFinishCompExam,
} from "../api";
import { ExamTimer } from "../components/exam-timer";
import { AnswerSheet } from "../components/answer-sheet";
import { ExamReport } from "../components/exam-report";
import { TOTAL_COMP_QUESTIONS } from "../constants";
import type { CompQuestion, CompReport } from "../types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CompSnapshot {
  answers: Record<string, string>;
}

function QuestionCard({
  question,
  index,
  total,
  selectedAnswer,
  onSelect,
  disabled,
}: {
  question: CompQuestion;
  index: number;
  total: number;
  selectedAnswer: string | undefined;
  onSelect: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            第 {index + 1} 题 / 共 {total} 题
          </span>
          <Badge variant="secondary">{question.chapter}</Badge>
          <Badge
            variant={
              question.difficulty === "hard"
                ? "destructive"
                : question.difficulty === "medium"
                  ? "default"
                  : "outline"
            }
          >
            {question.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
          {question.question}
        </p>
        <div className="space-y-2">
          {Object.entries(question.options).map(([key, value]) => {
            const checked = selectedAnswer === key;
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-accent",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={key}
                  checked={checked}
                  onChange={() => onSelect(key)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-sm leading-relaxed text-foreground">
                  <span className="font-semibold">{key}.</span> {value}
                </span>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ChapterStats({ stats }: { stats: CompReport["chapterDistribution"] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight">章节得分分布</h3>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">章节</th>
              <th className="px-3 py-2 text-left font-semibold">题数</th>
              <th className="px-3 py-2 text-left font-semibold">正确</th>
              <th className="px-3 py-2 text-left font-semibold">正确率</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.chapter} className="border-t">
                <td className="px-3 py-2">{s.chapter}</td>
                <td className="px-3 py-2">{s.total}</td>
                <td className="px-3 py-2">{s.correct}</td>
                <td className="px-3 py-2">{s.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WrongQuestions({ questions }: { questions: CompReport["wrongQuestions"] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight">错题列表（共 {questions.length} 道）</h3>
      <div className="space-y-3">
        {questions.map((wq) => (
          <Card key={wq.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{wq.question}</p>
                <Badge variant="secondary">{wq.chapter}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                你的答案：{wq.userAnswer || "未作答"} / 正确答案：{wq.correctAnswer}
              </p>
              <p className="text-sm leading-relaxed text-foreground">
                <span className="font-semibold">解析：</span>
                {wq.explanation}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function CompExamPage() {
  const { data: activeExam, isLoading: statusLoading } = useExamStatus();
  const startExam = useStartExam();
  const [examId, setExamId] = useState<string | null>(null);
  const { data: paper } = useCompPaper(examId ?? undefined);
  const submitCompAnswer = useSubmitCompAnswer();
  const finishCompExam = useFinishCompExam();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<CompReport | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const initializedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Initialize: restore active comprehensive exam or start a new one.
  useEffect(() => {
    if (initializedRef.current || statusLoading) return;
    initializedRef.current = true;

    if (activeExam?.examType === "comprehensive" && activeExam.status === "in_progress") {
      setExamId(activeExam.id);
      setRemaining(activeExam.remainingTime);
      setIsRunning(true);
      const snapshot = (activeExam.answersSnapshot ?? {}) as unknown as CompSnapshot;
      if (snapshot.answers) setAnswers(snapshot.answers);
    } else {
      startExam.mutate(
        { examType: "comprehensive", mode: "single" },
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

  // Sync paper remaining time when it loads.
  useEffect(() => {
    if (paper && !report) {
      setRemaining((prev) => (prev > 0 ? prev : paper.remainingTime));
    }
  }, [paper, report]);

  // Timer countdown.
  useEffect(() => {
    if (isRunning && remaining > 0 && !report) {
      timerRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current);
            timerRef.current = null;
            void handleFinish();
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
  }, [isRunning, report]);

  const currentQuestion = paper?.questions[currentIndex] ?? null;
  const answerCount = useMemo(() => Object.keys(answers).length, [answers]);

  const handleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (examId) {
      submitCompAnswer.mutate(
        { examId, questionId, answer: value },
        { onError: () => toast.error("答案同步失败，请稍后重试") },
      );
    }
  };

  const handleFinish = async () => {
    if (!examId || report) return;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      const r = await finishCompExam.mutateAsync({ examId });
      setReport(r);
      setIsRunning(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失败");
    }
  };

  const navItems = useMemo(
    () =>
      paper?.questions.map((q, i) => ({
        key: i,
        label: String(i + 1),
        answered: !!answers[q.id],
      })) ?? [],
    [paper, answers],
  );

  // Report view
  if (report) {
    return (
      <ExamReport
        report={{
          title: "综合知识模拟考成绩",
          score: report.score,
          total: report.total,
          passLine: report.passLine,
          passed: report.passed,
          duration: report.duration,
        }}
      >
        <ChapterStats stats={report.chapterDistribution} />
        <WrongQuestions questions={report.wrongQuestions} />
      </ExamReport>
    );
  }

  // Loading / initializing skeleton
  if (!paper || !examId || !currentQuestion) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-[520px] w-[220px] shrink-0" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 py-6">
      <div className="flex-1 space-y-6">
        {/* Top bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">综合知识模拟考</h1>
                <p className="text-sm text-muted-foreground">
                  已答 <strong className="text-foreground">{answerCount}</strong> /{" "}
                  {TOTAL_COMP_QUESTIONS} 题
                </p>
              </div>
              <ExamTimer remaining={remaining} isRunning={isRunning} />
            </div>
          </CardContent>
        </Card>

        {/* Question card */}
        <QuestionCard
          question={currentQuestion}
          index={currentIndex}
          total={TOTAL_COMP_QUESTIONS}
          selectedAnswer={answers[currentQuestion.id]}
          onSelect={(value) => handleSelect(currentQuestion.id, value)}
          disabled={finishCompExam.isPending}
        />

        {/* Bottom navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0 || finishCompExam.isPending}
          >
            上一题
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.min(TOTAL_COMP_QUESTIONS - 1, i + 1))}
            disabled={currentIndex === TOTAL_COMP_QUESTIONS - 1 || finishCompExam.isPending}
          >
            下一题
          </Button>
        </div>

        {/* Submit */}
        <div className="flex justify-center">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleFinish}
            disabled={finishCompExam.isPending}
          >
            {finishCompExam.isPending ? "提交中…" : "提交试卷"}
          </Button>
        </div>
      </div>

      {/* Answer sheet */}
      <AnswerSheet
        items={navItems}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
        className="hidden lg:block"
      />
    </div>
  );
}
