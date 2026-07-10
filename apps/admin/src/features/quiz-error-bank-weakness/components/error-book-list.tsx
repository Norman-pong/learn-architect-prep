import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2Outlined,
  RotateCcwOutlined,
  BookOpenOutlined,
  ArrowLeftOutlined,
} from "@/components/ui/icons";
import { useErrorBook, useChapters, useMasterError, useSubmitQuiz } from "../api";
import { DIFFICULTY_TAG } from "../constants";
import type { ErrorBookItem } from "../types";

const OPTION_LABELS = ["A", "B", "C", "D"];

export function ErrorBookList() {
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<string>("");
  const [detailItem, setDetailItem] = useState<ErrorBookItem | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: chapters = [] } = useChapters();
  const { data: items = [], isLoading, error } = useErrorBook(chapter);
  const masterMutation = useMasterError();
  const submitMutation = useSubmitQuiz();

  const handleMaster = async (id: string) => {
    await masterMutation.mutateAsync(id);
  };

  const handleRePractice = (item: ErrorBookItem) => {
    setDetailItem(item);
    setAnswer(null);
    setResult(null);
  };

  const handleBack = () => {
    setDetailItem(null);
    setAnswer(null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!answer || !detailItem) return;
    setSubmitting(true);
    try {
      const res = await submitMutation.mutateAsync({
        questionId: detailItem.id,
        selectedAnswer: answer,
      });
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  if (detailItem) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" onClick={handleBack} className="-ml-2">
          <ArrowLeftOutlined className="h-4 w-4 mr-1" />
          返回错题列表
        </Button>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">错题重练</Badge>
              <Badge variant="outline">章节 {detailItem.chapter}</Badge>
              <Badge variant="outline">{DIFFICULTY_TAG[detailItem.difficulty]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="text-lg font-semibold leading-relaxed">{detailItem.question}</h3>

            <div className="space-y-3">
              {OPTION_LABELS.map(
                (key) =>
                  detailItem.options[key] && (
                    <button
                      key={key}
                      type="button"
                      disabled={!!result}
                      onClick={() => setAnswer(key)}
                      className={`
                        w-full text-left rounded-lg border px-4 py-3 transition-colors
                        flex items-start gap-3
                        ${
                          result && key === result.correctAnswer
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                            : result && key === answer
                              ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                              : answer === key
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-sm font-semibold">
                        {key}
                      </span>
                      <span className="pt-0.5">{detailItem.options[key]}</span>
                    </button>
                  ),
              )}
            </div>

            {!result && (
              <Button onClick={handleSubmit} disabled={!answer || submitting}>
                {submitting ? "提交中..." : "提交答案"}
              </Button>
            )}

            {result && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
                <div className="font-semibold">
                  {result.isCorrect ? (
                    <span className="text-emerald-600">回答正确</span>
                  ) : (
                    <span className="text-red-600">回答错误</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    正确答案：
                    <span className="font-semibold">{result.correctAnswer}</span>
                  </div>
                  <div>
                    你的选择：
                    <span className="font-semibold">{answer}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">解析</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {detailItem.explanation}
                  </p>
                </div>
                <Button onClick={handleBack}>返回错题列表</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpenOutlined className="h-6 w-6" />
          错题本
        </h2>
        <Select value={chapter} onValueChange={(v) => setChapter(v === "all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="按章节筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部章节</SelectItem>
            {chapters.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}（{c.id}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="text-sm text-red-600">
          {error instanceof Error ? error.message : "加载失败"}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : items.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2Outlined className="h-12 w-12 text-emerald-500" />
            <p className="text-lg font-medium">暂无错题，继续保持！</p>
            <Button onClick={() => navigate({ to: "/quiz" })} className="mt-2">
              去练习
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{DIFFICULTY_TAG[item.difficulty]}</Badge>
                    <Badge variant="outline">章节 {item.chapter}</Badge>
                    <span className="text-xs text-muted-foreground">
                      错于 {new Date(item.errorAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMaster(item.id)}
                      disabled={masterMutation.isPending}
                    >
                      <CheckCircle2Outlined className="h-4 w-4 mr-1" />
                      已掌握
                    </Button>
                    <Button size="sm" onClick={() => handleRePractice(item)}>
                      <RotateCcwOutlined className="h-4 w-4 mr-1" />
                      重新练习
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{item.question}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {OPTION_LABELS.map(
                    (key) =>
                      item.options[key] && (
                        <div
                          key={key}
                          className={`
                            text-sm rounded-md px-3 py-2 border
                            ${
                              key === item.correctAnswer
                                ? "border-emerald-500/50 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                : key === item.selectedAnswer
                                  ? "border-red-500/50 bg-red-50/50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                  : "border-border bg-muted/30"
                            }
                          `}
                        >
                          <span className="font-semibold mr-1">{key}.</span>
                          {item.options[key]}
                          {key === item.correctAnswer && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              正确答案
                            </Badge>
                          )}
                          {key === item.selectedAnswer && (
                            <Badge variant="destructive" className="ml-2 text-[10px]">
                              你的答案
                            </Badge>
                          )}
                        </div>
                      ),
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.explanation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
