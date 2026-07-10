import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hugeicon } from "@/components/ui/icons";
import {
  Award01Icon,
  BookOpen01Icon,
  Clock01Icon,
  Edit01Icon,
  File01Icon,
  PauseIcon,
  PlayIcon,
  SquareRootSquareIcon,
  Award01Icon as TrophyIcon,
} from "@hugeicons/core-free-icons";
import { EXAM_TYPE_LABEL, EXAM_TYPE_DESC, MODE_LABEL } from "../constants";
import {
  useExamConfigs,
  useExamStatus,
  useStartExam,
  useResumeExam,
  usePauseExam,
  useFinishExam,
} from "../api";
import { ExamTimer } from "../components/exam-timer";
import type { ExamType, ExamMode, ActiveExam, ExamConfig } from "../types";

type SingleExamType = Exclude<ExamType, "full">;
type ExamStatus = ActiveExam["status"];

interface SubjectMeta {
  icon: typeof SquareRootSquareIcon;
  accent: string;
}

const SUBJECT_META: Record<SingleExamType, SubjectMeta> = {
  comprehensive: {
    icon: SquareRootSquareIcon,
    accent: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  case: {
    icon: File01Icon,
    accent: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  essay: {
    icon: Edit01Icon,
    accent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

function useExamTimer(exam: ActiveExam | null, onTimeUp: () => void) {
  const [remaining, setRemaining] = useState(exam?.remainingTime ?? 0);
  const [isRunning, setIsRunning] = useState(false);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (exam) {
      setRemaining(exam.remainingTime);
      setIsRunning(exam.status === "active");
    }
  }, [exam?.id, exam?.remainingTime, exam?.status]);

  useEffect(() => {
    if (!isRunning || remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, remaining]);

  return { remaining, isRunning, setIsRunning, setRemaining };
}

function ModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: ExamMode;
  selected: boolean;
  onSelect: (mode: ExamMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={cn(
        "flex flex-1 items-start gap-4 rounded-xl border p-5 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Hugeicon iconData={mode === "single" ? BookOpen01Icon : TrophyIcon} size={20} />
      </div>
      <div>
        <div className="font-semibold text-foreground">{MODE_LABEL[mode]}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {mode === "single"
            ? "任选一门科目进行独立模拟考试"
            : "连续完成综合知识与案例分析模拟考试"}
        </div>
      </div>
    </button>
  );
}

function SubjectCard({
  config,
  selected,
  onSelect,
}: {
  config: ExamConfig;
  selected: boolean;
  onSelect: (type: SingleExamType) => void;
}) {
  const meta = SUBJECT_META[config.examType];
  const label = EXAM_TYPE_LABEL[config.examType];
  const desc = EXAM_TYPE_DESC[config.examType];

  return (
    <button
      type="button"
      onClick={() => onSelect(config.examType)}
      className={cn(
        "flex flex-col rounded-xl border p-5 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", meta.accent)}>
          <Hugeicon iconData={meta.icon} size={20} />
        </div>
        {selected && (
          <Badge variant="default" className="text-xs">
            已选
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <div className="text-base font-semibold text-foreground">{label}</div>
        <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Hugeicon iconData={Clock01Icon} size={14} />
          {config.duration} 分钟
        </div>
        <div className="flex items-center gap-1.5">
          <Hugeicon iconData={Award01Icon} size={14} />
          {config.questionCount} 题{config.chooseCount ? `（选${config.chooseCount}）` : ""}
        </div>
      </div>
    </button>
  );
}

export function ExamModePage() {
  const navigate = useNavigate();
  const { data: configs = [], isLoading: loadingConfigs } = useExamConfigs();
  const { data: activeExam, isLoading: loadingStatus } = useExamStatus();
  const startExam = useStartExam();
  const resumeExam = useResumeExam();
  const pauseExam = usePauseExam();
  const finishExam = useFinishExam();

  const [mode, setMode] = useState<ExamMode>("single");
  const [singleType, setSingleType] = useState<SingleExamType>("comprehensive");
  const [started, setStarted] = useState(false);
  const [exam, setExam] = useState<ActiveExam | null>(null);

  const { remaining, isRunning, setIsRunning, setRemaining } = useExamTimer(exam, () => {
    if (exam) {
      finishExam.mutate({ examId: exam.id, answersSnapshot: exam.answersSnapshot });
    }
  });

  const singleConfigs = configs;
  const selectedExamType: ExamType = mode === "single" ? singleType : "full";

  const handleStart = async () => {
    let data: ActiveExam;
    try {
      data = await startExam.mutateAsync({
        examType: selectedExamType,
        mode,
      });
    } catch {
      return;
    }
    if (!data) return;

    if (data.examType === "comprehensive") {
      void navigate({ to: "/exam/comp" });
      return;
    }

    setExam(data);
    setStarted(true);
    setIsRunning(true);
    setRemaining(data.remainingTime);
  };

  const handleResume = async (examId: string) => {
    let data: ActiveExam;
    try {
      data = await resumeExam.mutateAsync({ examId });
    } catch {
      return;
    }
    if (!data) return;

    if (data.examType === "comprehensive") {
      void navigate({ to: "/exam/comp" });
      return;
    }

    setExam(data);
    setStarted(true);
    setIsRunning(true);
    setRemaining(data.remainingTime);
  };
  const handlePause = async () => {
    if (!exam) return;
    let data: { id: string; status: string; remainingTime: number };
    try {
      data = await pauseExam.mutateAsync({
        examId: exam.id,
        remainingTime: remaining,
        answersSnapshot: exam.answersSnapshot,
      });
    } catch {
      return;
    }
    if (!data) return;
    setIsRunning(false);
    setRemaining(data.remainingTime);
  };
  const handleFinish = async () => {
    if (!exam) return;
    try {
      await finishExam.mutateAsync({
        examId: exam.id,
        answersSnapshot: exam.answersSnapshot,
      });
    } catch {
      return;
    }
    setStarted(false);
    setExam(null);
    setIsRunning(false);
    setRemaining(0);
  };

  const renderSelector = () => (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">模拟考试</h1>
        <p className="text-sm text-muted-foreground">选择考试模式与科目，开始计时模拟练习。</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <ModeCard mode="single" selected={mode === "single"} onSelect={setMode} />
        <ModeCard mode="full" selected={mode === "full"} onSelect={setMode} />
      </div>

      {mode === "single" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loadingConfigs ? (
            <>
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            </>
          ) : (
            singleConfigs.map((config) => (
              <SubjectCard
                key={config.examType}
                config={config}
                selected={singleType === config.examType}
                onSelect={setSingleType}
              />
            ))
          )}
        </div>
      )}

      {mode === "full" && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">全模块模式</CardTitle>
            <CardDescription>
              综合知识与案例分析连续进行，共 240 分钟；论文模块（120 分钟）需单独进入。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <Badge variant="outline">综合知识</Badge>
              <Badge variant="outline">案例分析</Badge>
              <span>连续计时，不可拆分</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleStart}
          disabled={startExam.isPending || loadingConfigs || loadingStatus}
          className="min-w-[120px]"
        >
          {startExam.isPending ? "启动中…" : "开始考试"}
        </Button>
        {activeExam && (
          <Button
            variant="outline"
            onClick={() => handleResume(activeExam.id)}
            disabled={resumeExam.isPending}
          >
            <Hugeicon iconData={PlayIcon} size={16} />
            继续上次考试（{EXAM_TYPE_LABEL[activeExam.examType]}）
          </Button>
        )}
      </div>
    </div>
  );

  const renderExam = () => {
    if (!exam) return null;
    const typeLabel = EXAM_TYPE_LABEL[exam.examType];
    const status: ExamStatus = isRunning ? "active" : "paused";

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle>{typeLabel}模拟考</CardTitle>
                <CardDescription>
                  模式：{MODE_LABEL[exam.mode]} · 科目：{typeLabel}
                </CardDescription>
              </div>
              <ExamTimer remaining={remaining} isRunning={isRunning} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <span className="text-muted-foreground">总时长</span>
                <span className="font-medium">{exam.duration} 分钟</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <span className="text-muted-foreground">状态</span>
                <Badge variant={status === "active" ? "default" : "secondary"}>
                  {status === "active" ? "进行中" : "已暂停"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {isRunning ? (
                <Button variant="outline" onClick={handlePause} disabled={pauseExam.isPending}>
                  <Hugeicon iconData={PauseIcon} size={16} />
                  暂停
                </Button>
              ) : (
                <Button onClick={() => handleResume(exam.id)} disabled={resumeExam.isPending}>
                  <Hugeicon iconData={PlayIcon} size={16} />
                  继续
                </Button>
              )}
              <Button variant="destructive" onClick={handleFinish} disabled={finishExam.isPending}>
                提交试卷
              </Button>
            </div>

            <div className="rounded-lg border border-dashed bg-muted/50 p-6 text-center text-sm text-muted-foreground">
              答题界面将在后续迭代中实现。当前页面展示模式选择、计时与暂停/继续功能。
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] p-4 sm:p-6 lg:p-8">
      {started ? renderExam() : renderSelector()}
    </div>
  );
}
