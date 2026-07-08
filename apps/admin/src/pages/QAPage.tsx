import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Button,
  Card,
  Empty,
  Input,
  Layout,
  List,
  Space,
  Spin,
  Tag,
  Typography,
  theme,
} from "antd";
import { SendOutlined, BookOutlined } from "@ant-design/icons";
import { fetchWithAuth } from "../api/client";

const { Content } = Layout;
const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ChapterMeta {
  id: string;
  title: string;
  section: string;
  examWeight: number;
  order: number;
}

interface KnowledgePoint {
  id: string;
  title: string;
  examWeight: number;
  file: string;
}

interface ChapterIndex {
  id: string;
  title: string;
  examWeight: number;
  knowledgePoints: KnowledgePoint[];
}

interface QAHistoryItem {
  role: "user" | "assistant";
  content: string;
}

interface ChapterInfo {
  chapterId: string;
  chapterTitle: string;
  kpId: string;
  kpTitle: string;
}

export default function QAPage() {
  const { chapterId, kpId } = useParams<{ chapterId?: string; kpId?: string }>();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [chapterIndex, setChapterIndex] = useState<ChapterIndex | null>(null);
  const [chapterInfo, setChapterInfo] = useState<ChapterInfo | null>(null);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load chapters list
  useEffect(() => {
    fetch("/api/knowledge/chapters")
      .then((r) => r.json())
      .then((data) => setChapters(data.chapters ?? []))
      .catch(() => setChapters([]));
  }, []);

  // Load chapter index when chapterId changes
  useEffect(() => {
    if (!chapterId) {
      setChapterIndex(null);
      setChapterInfo(null);
      return;
    }
    fetch(`/api/knowledge/chapters/${chapterId}`)
      .then((r) => r.json())
      .then((data: ChapterIndex) => {
        setChapterIndex(data);
        if (kpId) {
          const kp = data.knowledgePoints.find((k) => k.id === kpId);
          if (kp) {
            setChapterInfo({
              chapterId,
              chapterTitle: data.title,
              kpId,
              kpTitle: kp.title,
            });
          }
        }
      })
      .catch(() => setChapterIndex(null));
  }, [chapterId, kpId]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, loading, scrollToBottom]);

  const handleAsk = useCallback(async () => {
    if (!chapterInfo || !question.trim()) return;

    const userQuestion = question.trim();
    setQuestion("");
    setError(null);
    setLoading(true);

    const newHistory: QAHistoryItem[] = [...history, { role: "user", content: userQuestion }];
    setHistory(newHistory);

    try {
      const response = await fetchWithAuth("/api/qa/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: chapterInfo.chapterId,
          knowledgePointId: chapterInfo.kpId,
          question: userQuestion,
          history: history.length > 0 ? history : undefined,
        }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : "请求失败";
        throw new Error(message);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      // Add placeholder for assistant response
      setHistory((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const event: unknown = JSON.parse(jsonStr);
            if (
              typeof event === "object" &&
              event !== null &&
              "type" in event &&
              (event.type === "chunk" || event.type === "done" || event.type === "error")
            ) {
              if (event.type === "chunk" && "data" in event && typeof event.data === "string") {
                assistantContent += event.data;
                setHistory((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === "assistant") {
                    last.content = assistantContent;
                  }
                  return next;
                });
              } else if (event.type === "error") {
                const errMessage =
                  "message" in event && typeof event.message === "string"
                    ? event.message
                    : "流式响应错误";
                throw new Error(errMessage);
              }
            }
          } catch {
            // ignore malformed sse lines
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      // Remove the empty assistant placeholder if error occurred
      setHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && last.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [chapterInfo, question, history]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleAsk();
      }
    },
    [handleAsk],
  );

  const selectKnowledgePoint = useCallback(
    (chId: string, kId: string, kTitle: string, chTitle: string) => {
      setChapterInfo({ chapterId: chId, chapterTitle: chTitle, kpId: kId, kpTitle: kTitle });
      setHistory([]);
      setError(null);
      void navigate(`/qa/${chId}/${kId}`);
    },
    [navigate],
  );

  return (
    <Layout style={{ height: "100%", background: token.colorBgContainer }}>
      <Content style={{ display: "flex", height: "100%", gap: token.padding }}>
        {/* Left sidebar: chapter/kp selector */}
        <Card
          style={{
            width: 280,
            flexShrink: 0,
            overflow: "auto",
            borderRadius: token.borderRadiusLG,
          }}
          bodyStyle={{ padding: token.paddingSM }}
          title="选择知识点"
        >
          {chapters.length === 0 ? (
            <Spin size="small" />
          ) : (
            <Space direction="vertical" style={{ width: "100%" }} size="small">
              {chapters.map((ch) => (
                <Card
                  key={ch.id}
                  size="small"
                  title={
                    <Space>
                      <BookOutlined />
                      <Text strong>{ch.title}</Text>
                    </Space>
                  }
                  style={{
                    background:
                      chapterInfo?.chapterId === ch.id
                        ? token.colorPrimaryBg
                        : token.colorFillAlter,
                  }}
                >
                  <Space direction="vertical" style={{ width: "100%" }} size="small">
                    {chapterIndex && chapterInfo?.chapterId === ch.id
                      ? chapterIndex.knowledgePoints.map((kp) => (
                          <Button
                            key={kp.id}
                            type={chapterInfo?.kpId === kp.id ? "primary" : "text"}
                            size="small"
                            block
                            onClick={() =>
                              selectKnowledgePoint(ch.id, kp.id, kp.title, ch.title)
                            }
                          >
                            <Space>
                              <Text style={{ fontSize: 12 }}>{kp.title}</Text>
                              {kp.examWeight >= 4 && (
                                <Tag color="error" style={{ fontSize: 10, lineHeight: 1.4 }}>
                                  重点
                                </Tag>
                              )}
                            </Space>
                          </Button>
                        ))
                      : null}
                    {chapterInfo?.chapterId !== ch.id && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          void fetch(`/api/knowledge/chapters/${ch.id}`)
                            .then((r) => r.json())
                            .then((data: ChapterIndex) => {
                              setChapterIndex(data);
                              if (data.knowledgePoints.length > 0) {
                                const first = data.knowledgePoints[0];
                                selectKnowledgePoint(
                                  ch.id,
                                  first.id,
                                  first.title,
                                  data.title,
                                );
                              }
                            })
                            .catch(() => {});
                        }}
                      >
                        展开
                      </Button>
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Card>

        {/* Right: chat area */}
        <Card
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: token.borderRadiusLG,
            overflow: "hidden",
          }}
          bodyStyle={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
          }}
          title={
            chapterInfo ? (
              <Space>
                <Tag color="blue">{chapterInfo.chapterTitle}</Tag>
                <Text strong>{chapterInfo.kpTitle}</Text>
              </Space>
            ) : (
              "AI 知识点答疑"
            )
          }
        >
          {!chapterInfo ? (
            <Empty
              style={{ margin: "auto" }}
              description="请从左侧选择一个知识点开始提问"
            />
          ) : (
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: token.padding,
                }}
              >
                <List
                  dataSource={history}
                  renderItem={(item, index) => (
                    <List.Item
                      key={index}
                      style={{
                        justifyContent:
                          item.role === "user" ? "flex-end" : "flex-start",
                        padding: `${token.paddingXS}px 0`,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: token.paddingSM,
                          borderRadius: token.borderRadiusLG,
                          background:
                            item.role === "user"
                              ? token.colorPrimaryBg
                              : token.colorFillAlter,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {item.role === "assistant" && index === history.length - 1 && loading && item.content === "" ? (
                          <Spin size="small" />
                        ) : (
                          <Paragraph style={{ margin: 0 }}>
                            {item.content}
                          </Paragraph>
                        )}
                        {item.role === "assistant" && item.content && (
                          <div style={{ marginTop: token.marginXS }}>
                            <Tag color="default">
                              引用：{chapterInfo.chapterTitle}
                            </Tag>
                          </div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
                {error && (
                  <div style={{ textAlign: "center", padding: token.paddingSM }}>
                    <Text type="danger">{error}</Text>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div
                style={{
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                  padding: token.padding,
                  background: token.colorBgElevated,
                }}
              >
                <Space.Compact style={{ width: "100%" }}>
                  <TextArea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入问题，按 Enter 发送，Shift+Enter 换行..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    disabled={loading}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleAsk}
                    loading={loading}
                    disabled={!question.trim() || loading}
                  >
                    发送
                  </Button>
                </Space.Compact>
              </div>
            </>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
