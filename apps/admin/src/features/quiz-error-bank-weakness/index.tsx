import { toast } from "sonner";

import { useState, useEffect } from "react";
import { useSearch } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditOutlined } from "@/components/ui/icons";
import { useChapters, useSmartSelect, useQuizStart } from "./api";
import { QuizPlayer } from "./components/quiz-player";
import { DIFFICULTY_TAG } from "./constants";
import type { Question, ChapterMeta } from "./types";

export function QuizPage() {
  const search = useSearch({ strict: false }) as {
    smart?: string;
    chapter?: string;
    mode?: string;
  };
  const smartMode = search.smart === "true";
  const initialChapter = search.chapter || "";
  const rawMode = search.mode;
  const initialMode: "chapter" | "random" | "error" =
    rawMode === "chapter" || rawMode === "random" || rawMode === "error" ? rawMode : "random";

  const [mode, setMode] = useState(initialMode);
  const [chapter, setChapter] = useState(initialChapter);
  const [count, setCount] = useState(20);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: chapters = [], isLoading: chaptersLoading } = useChapters();
  const smartQuery = useSmartSelect(initialChapter);
  const startQuery = useQuizStart(mode, count, chapter);

  useEffect(() => {
    if (smartMode && initialChapter) {
      smartQuery
        .refetch()
        .then((res) => {
          const data = res.data;
          if (data) {
            if (data.questions.length === 0) {
              setError("当前薄弱点没有可用题目。");
            } else {
              setQuestions(data.questions);
              setError(null);
              setStarted(true);
            }
          }
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "智能选题失败");
        });
    }
  }, [smartMode, initialChapter]);

  const start = async () => {
    setError(null);
    try {
      const res = await startQuery.refetch();
      const qs = res.data ?? [];
      if (qs.length === 0) {
        setError("当前条件下没有可用题目。");
        return;
      }
      setQuestions(qs);
      setCurrentIndex(0);
      setStarted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "出题失败");
    }
  };

  const finish = () => {
    setStarted(false);
    setQuestions([]);
    setError(null);
    toast.success("练习完成");
  };

  if (started && questions[currentIndex]) {
    return (
      <QuizPlayer
        question={questions[currentIndex]}
        onAnswer={() => {}}
        onNext={() => {
          if (currentIndex + 1 < questions.length) {
            setCurrentIndex(currentIndex + 1);
          } else {
            finish();
          }
        }}
      />
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EditOutlined className="h-5 w-5" />
          选择题练习
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">练习模式</label>
          <Select
            value={mode}
            onValueChange={(value) => {
              setMode(value as "chapter" | "random" | "error");
              if (value !== "chapter") setChapter("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chapter">章节练习</SelectItem>
              <SelectItem value="random">随机练习</SelectItem>
              <SelectItem value="error">错题重练</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "chapter" && (
          <div className="space-y-2">
            <Select value={chapter} onValueChange={(v) => setChapter(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="请选择章节" />
              </SelectTrigger>
              <SelectContent>
                {chaptersLoading ? (
                  <SelectItem value="" disabled>
                    加载中…
                  </SelectItem>
                ) : (
                  chapters.map((c: ChapterMeta) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}（{c.id}）
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">题目数量</label>
          <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 题</SelectItem>
              <SelectItem value="20">20 题</SelectItem>
              <SelectItem value="50">50 题</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {smartMode && (
          <div className="text-sm text-muted-foreground">
            智能选题模式：基于薄弱点推荐题目
            {chapter && (
              <Badge variant="outline" className="ml-2">
                {DIFFICULTY_TAG["easy"]}
              </Badge>
            )}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
            {error}
          </div>
        )}

        <Button
          onClick={start}
          disabled={
            chaptersLoading ||
            (mode === "chapter" && !chapter) ||
            startQuery.isFetching ||
            smartQuery.isFetching
          }
        >
          {startQuery.isFetching || smartQuery.isFetching ? "加载中..." : "开始练习"}
        </Button>
      </CardContent>
    </Card>
  );
}

export { ErrorBookList as ErrorBookPage } from "./components/error-book-list";
export { QuizBankTable as QuizBankPage } from "./components/quiz-bank-table";
export { WeaknessPanel as WeaknessPage } from "./components/weakness-panel";

export type {
  Question,
  SubmitResult,
  ErrorBookItem,
  ChapterMeta,
  QuizBankStats,
  WeaknessItem,
} from "./types";
