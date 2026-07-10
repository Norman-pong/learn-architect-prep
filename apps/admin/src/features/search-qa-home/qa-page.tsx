import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOutlined } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { useChapters, useChapterIndex, useAskQuestion } from "./api";
import { ChatMessageBubble } from "./components/chat-message";
import { QAInput } from "./components/qa-input";
import type { ChatMessage, KnowledgePoint } from "./types";

interface ChapterInfo {
  chapterId: string;
  chapterTitle: string;
  kpId: string;
  kpTitle: string;
}

export function QAPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const chapterId = params.chapterId as string | undefined;
  const kpId = params.kpId as string | undefined;

  const { data: chapters = [], isLoading: loadingChapters } = useChapters();
  const { data: chapterIndex } = useChapterIndex(chapterId);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ask = useAskQuestion();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history]);

  const chapterInfo: ChapterInfo | null = useMemo(() => {
    if (!chapterId || !chapterIndex) return null;
    const kp = kpId
      ? chapterIndex.knowledgePoints.find((k) => k.id === kpId)
      : chapterIndex.knowledgePoints[0];
    if (!kp) return null;
    return {
      chapterId,
      chapterTitle: chapterIndex.title,
      kpId: kp.id,
      kpTitle: kp.title,
    };
  }, [chapterId, kpId, chapterIndex]);

  const selectKnowledgePoint = useCallback(
    (chId: string, kId: string) => {
      setHistory([]);
      setErrorMessage(null);
      void navigate({
        to: "/qa/$chapterId/$kpId",
        params: { chapterId: chId, kpId: kId },
      });
    },
    [navigate],
  );

  const expandChapter = useCallback(
    async (ch: { id: string; title: string }) => {
      const { data, error: apiError } = await (api as any).knowledge.chapters[ch.id].get();
      if (apiError || !data) return;
      const index = data as {
        id: string;
        title: string;
        knowledgePoints: KnowledgePoint[];
      };
      if (index.knowledgePoints.length > 0) {
        const first = index.knowledgePoints[0];
        selectKnowledgePoint(ch.id, first.id);
      }
    },
    [selectKnowledgePoint],
  );

  const handleAsk = useCallback(() => {
    if (!chapterInfo || !question.trim() || ask.isPending) return;
    const userQuestion = question.trim();
    setQuestion("");
    setErrorMessage(null);
    setHistory((prev) => [
      ...prev,
      { role: "user", content: userQuestion },
      { role: "assistant", content: "" },
    ]);

    ask.mutate(
      {
        chapterId: chapterInfo.chapterId,
        knowledgePointId: chapterInfo.kpId,
        question: userQuestion,
        history: history.length > 0 ? history : undefined,
        onChunk: (chunk) => {
          setHistory((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1 && m.role === "assistant"
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          );
        },
      },
      {
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : "答疑失败");
          setHistory((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.content === "") {
              return prev.slice(0, -1);
            }
            return prev;
          });
        },
      },
    );
  }, [chapterInfo, question, ask, history]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-4 overflow-hidden p-4">
      {/* Sidebar */}
      <Card className="flex w-72 shrink-0 flex-col overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">选择知识点</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-3 pt-0">
          {loadingChapters ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {chapters.map((ch) => {
                const active = chapterInfo?.chapterId === ch.id;
                return (
                  <div
                    key={ch.id}
                    className={`rounded-lg border p-2 transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 bg-card hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BookOutlined className="size-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{ch.title}</span>
                    </div>
                    {active && chapterIndex && (
                      <div className="mt-2 space-y-1">
                        {chapterIndex.knowledgePoints.map((kp) => (
                          <Button
                            key={kp.id}
                            variant={chapterInfo?.kpId === kp.id ? "default" : "ghost"}
                            size="sm"
                            className="h-auto w-full justify-start gap-2 py-1.5 text-xs"
                            onClick={() => selectKnowledgePoint(ch.id, kp.id)}
                          >
                            <span className="flex-1 truncate text-left">{kp.title}</span>
                            {kp.examWeight >= 4 && (
                              <Badge variant="destructive" className="text-[10px]">
                                重点
                              </Badge>
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                    {!active && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => expandChapter(ch)}
                      >
                        展开
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b border-border pb-3">
          {chapterInfo ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{chapterInfo.chapterTitle}</Badge>
              <span className="text-sm font-semibold">{chapterInfo.kpTitle}</span>
            </div>
          ) : (
            <CardTitle className="text-sm font-semibold">AI 知识点答疑</CardTitle>
          )}
        </CardHeader>

        {!chapterInfo ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            请从左侧选择一个知识点开始提问
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto p-4">
              {history.map((item, index) => (
                <ChatMessageBubble
                  key={index}
                  message={item}
                  isLast={index === history.length - 1}
                  isLoading={ask.isPending}
                  chapterTitle={item.role === "assistant" ? chapterInfo.chapterTitle : undefined}
                />
              ))}
              {errorMessage && (
                <div className="text-center text-sm text-destructive">{errorMessage}</div>
              )}
            </div>
            <QAInput
              value={question}
              onChange={setQuestion}
              onSubmit={handleAsk}
              loading={ask.isPending}
            />
          </>
        )}
      </Card>
    </div>
  );
}
