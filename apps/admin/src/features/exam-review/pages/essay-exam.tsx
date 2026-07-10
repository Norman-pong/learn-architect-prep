import { SectionPageLayout } from "@/components/layout";
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { type ThesisSectionKey, type ThesisSections } from "@archprep/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileTextOutlined,
  SaveOutlined,
  SendOutlined,
  WarningOutlined,
} from "@/components/ui/icons";
import { ExamTimer } from "../components/exam-timer";
import { EssayEditor } from "../components/essay-editor";
import { EssayReport } from "../components/essay-report";
import {
  useExamStatus,
  useStartExam,
  useEssayPaper,
  useSubmitEssay,
  useFinishEssayExam,
} from "../api";
import type { EssayReport as EssayReportType } from "../types";

const EMPTY_SECTIONS: ThesisSections = {
  summary: "",
  background: "",
  solution: "",
  reflection: "",
  conclusion: "",
};

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null) return false;
  for (const k of Object.keys(value as Record<string, unknown>)) {
    if (typeof (value as Record<string, unknown>)[k] !== "string") return false;
  }
  return true;
}

export function EssayExamPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = React.useState<"loading" | "select" | "write" | "report">("loading");
  const [examId, setExamId] = React.useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(null);
  const [sections, setSections] = React.useState<ThesisSections>(EMPTY_SECTIONS);
  const [remaining, setRemaining] = React.useState(0);
  const [report, setReport] = React.useState<EssayReportType | null>(null);
  const [saveState, setSaveState] = React.useState<"saved" | "saving" | "unsaved">("saved");
  const [error, setError] = React.useState<string | null>(null);

  const dirtyRef = React.useRef(false);
  const sectionsRef = React.useRef(sections);
  const selectedQuestionIdRef = React.useRef(selectedQuestionId);
  const examIdRef = React.useRef(examId);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  sectionsRef.current = sections;
  selectedQuestionIdRef.current = selectedQuestionId;
  examIdRef.current = examId;

  const { data: examStatus, isLoading: statusLoading } = useExamStatus();
  const startExam = useStartExam();
  const { data: paper } = useEssayPaper(examId ?? undefined);
  const submitEssay = useSubmitEssay();
  const finishExam = useFinishEssayExam();

  // Initialize exam on mount
  React.useEffect(() => {
    if (statusLoading) return;

    const active = examStatus;
    if (active?.examType === "essay" && active.status === "in_progress") {
      setExamId(active.id);
      setRemaining(active.remainingTime);
      const snap = active.answersSnapshot;
      if (typeof snap === "object" && snap !== null) {
        if (typeof (snap as Record<string, unknown>).selectedQuestionId === "string") {
          setSelectedQuestionId((snap as Record<string, unknown>).selectedQuestionId as string);
        }
        const snapSections = (snap as Record<string, unknown>).sections;
        if (
          typeof snapSections === "object" &&
          snapSections !== null &&
          isStringRecord(snapSections)
        ) {
          setSections({ ...EMPTY_SECTIONS, ...snapSections });
        }
      }
      setPhase("select");
    } else {
      startExam.mutate(
        { examType: "essay", mode: "single" },
        {
          onSuccess: (data) => {
            setExamId(data.id);
            setRemaining(data.remainingTime);
            setPhase("select");
          },
          onError: (err) => {
            setError(err instanceof Error ? err.message : "启动考试失败");
            setPhase("select");
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusLoading, examStatus]);

  // Timer countdown
  React.useEffect(() => {
    if (phase !== "write" || remaining <= 0) return;
    timerIntervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          void handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remaining]);

  // Autosave debounce (30s)
  React.useEffect(() => {
    if (phase !== "write" || !dirtyRef.current || !examId || !selectedQuestionId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void doSubmit(false);
    }, 30_000);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sections, selectedQuestionId, examId]);

  const doSubmit = async (manual: boolean): Promise<void> => {
    const targetExamId = examIdRef.current;
    const targetQuestionId = selectedQuestionIdRef.current;
    const targetSections = sectionsRef.current;
    if (!targetExamId || !targetQuestionId) return;
    if (!dirtyRef.current && !manual) return;

    setSaveState("saving");
    try {
      await submitEssay.mutateAsync({
        examId: targetExamId,
        selectedQuestionId: targetQuestionId,
        sections: targetSections,
      });
      dirtyRef.current = false;
      setSaveState("saved");
      if (manual) toast.success("已保存草稿");
    } catch (err) {
      setSaveState("unsaved");
      if (manual) toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleSelectQuestion = async (id: string) => {
    if (selectedQuestionId === id) return;
    if (selectedQuestionId && dirtyRef.current) {
      await doSubmit(false);
    }
    setSelectedQuestionId(id);
    setSections(EMPTY_SECTIONS);
    dirtyRef.current = true;
    setSaveState("unsaved");
    setPhase("write");
  };

  const patchSection = (key: ThesisSectionKey, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
    dirtyRef.current = true;
    setSaveState("unsaved");
  };

  const handleFinish = async () => {
    const targetExamId = examIdRef.current;
    if (!targetExamId || report) return;
    await doSubmit(false);
    try {
      const result = await finishExam.mutateAsync({ examId: targetExamId });
      setReport(result);
      setPhase("report");
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失败");
    }
  };

  const selectedQuestion = React.useMemo(
    () => paper?.questions.find((q) => q.id === selectedQuestionId) ?? null,
    [paper, selectedQuestionId],
  );

  if (error) {
    return (
      <SectionPageLayout title="论文模拟考" description="4 选 1，120 分钟">
        <div className="mx-auto max-w-2xl py-12">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <WarningOutlined className="h-12 w-12 text-destructive" />
              <h3 className="text-lg font-semibold">考试加载失败</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => navigate({ to: "/exam/history" })}>返回考试记录</Button>
            </CardContent>
          </Card>
        </div>
      </SectionPageLayout>
    );
  }

  if (phase === "report" && report) {
    return (
      <SectionPageLayout title="论文模拟考" description="4 选 1，120 分钟">
        <EssayReport report={report} onBack={() => navigate({ to: "/exam/history" })} />
      </SectionPageLayout>
    );
  }

  if (phase === "select" || !selectedQuestionId) {
    return (
      <SectionPageLayout title="论文模拟考" description="4 选 1，120 分钟">
        <div className="mx-auto max-w-4xl py-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileTextOutlined className="h-5 w-5" />
                论文模拟考（4 选 1）
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                请选择一道论文题目，倒计时将在选题后开始
              </p>
              <div className="space-y-3">
                {paper?.questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleSelectQuestion(q.id)}
                    className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent/50"
                  >
                    <p className="font-medium text-card-foreground">{q.title}</p>
                    {q.requirements.length > 0 && (
                      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                        {q.requirements.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">{q.source}</Badge>
                      {q.year && <Badge variant="outline">{q.year} 年</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionPageLayout>
    );
  }

  return (
    <SectionPageLayout title="论文模拟考" description="4 选 1，120 分钟">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3 py-3 sm:gap-4 sm:py-4">
        <div className="flex flex-col gap-3 rounded-lg border bg-card px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <FileTextOutlined className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold sm:text-lg">论文模拟考</h1>
            {selectedQuestion && (
              <span className="truncate text-sm text-muted-foreground">
                {selectedQuestion.title}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ExamTimer remaining={remaining} isRunning={phase === "write"} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => doSubmit(true)}
              disabled={saveState === "saving"}
              className="flex-1 gap-1.5 sm:flex-none"
            >
              <SaveOutlined className="h-4 w-4" />
              保存草稿
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleFinish}
              className="flex-1 gap-1.5 sm:flex-none"
            >
              <SendOutlined className="h-4 w-4" />
              交卷
            </Button>
          </div>
        </div>

        {selectedQuestion?.requirements.length ? (
          <div className="rounded-lg border bg-card px-3 py-3 sm:px-4">
            <p className="text-sm font-medium">写作要求：</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              {selectedQuestion.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 rounded-lg border bg-card">
          <EssayEditor sections={sections} onChange={patchSection} onSave={() => doSubmit(true)} />
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground sm:px-4">
          {saveState === "saved" && <span className="text-emerald-600">已保存</span>}
          {saveState === "saving" && (
            <span className="animate-pulse text-muted-foreground">保存中…</span>
          )}
          {saveState === "unsaved" && <span className="text-amber-600">未保存</span>}
        </div>
      </div>
    </SectionPageLayout>
  );
}
