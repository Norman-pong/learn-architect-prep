import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Card,
  Empty,
  List,
  Radio,
  Result,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { CheckCircleOutlined, RedoOutlined, BookOutlined } from "@ant-design/icons";
import { apiRequest, fetchWithAuth } from "../api/client";

const { Title, Text, Paragraph } = Typography;

interface ErrorBookItem {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  year: number;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  errorAt: string;
  mastered: boolean;
  masteredAt?: string;
}

interface ChapterMeta {
  id: string;
  title: string;
  section: string;
  examWeight: number;
  order: number;
}

const DIFFICULTY_TAG: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "success",
  medium: "warning",
  hard: "error",
};

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function ErrorBookPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ErrorBookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [chapter, setChapter] = useState<string>("");
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [masteringId, setMasteringId] = useState<string | null>(null);

  // Detail view state for re-practice
  const [detailItem, setDetailItem] = useState<ErrorBookItem | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  } | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/knowledge/chapters")
      .then(async (res) => {
        if (!res.ok) throw new Error("加载章节失败");
        return (await res.json()) as { chapters: ChapterMeta[] };
      })
      .then((data) => setChapters(data.chapters))
      .catch(() => setChapters([]));
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("mastered", "false");
      if (chapter) params.set("chapter", chapter);
      const data = await apiRequest<ErrorBookItem[]>(`/api/error-book?${params.toString()}`);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter]);

  const handleMaster = async (questionId: string) => {
    setMasteringId(questionId);
    try {
      await apiRequest<{ success: boolean }>("/api/error-book/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      setItems((prev) => prev.filter((i) => i.id !== questionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "标记失败");
    } finally {
      setMasteringId(null);
    }
  };

  const handleRePractice = (item: ErrorBookItem) => {
    setDetailItem(item);
    setAnswer(null);
    setResult(null);
  };

  const submitRePractice = async () => {
    if (!answer || !detailItem) return;
    setSubmitting(true);
    try {
      const res = await apiRequest<{
        isCorrect: boolean;
        correctAnswer: string;
        explanation: string;
      }>("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: detailItem.id,
          selectedAnswer: answer,
        }),
      });
      setResult(res);
      if (res.isCorrect) {
        // Auto-remove from error list if now correct
        setItems((prev) => prev.filter((i) => i.id !== detailItem.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const chapterOptions = useMemo(
    () =>
      chapters.map((c) => ({
        value: c.id,
        label: `${c.title}（${c.id}）`,
      })),
    [chapters],
  );

  if (detailItem) {
    return (
      <Card style={{ maxWidth: 720, margin: "24px auto" }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Button onClick={() => setDetailItem(null)}>返回错题列表</Button>
          <Space wrap>
            <Tag color="blue">错题重练</Tag>
            <Tag>章节 {detailItem.chapter}</Tag>
            <Tag color={DIFFICULTY_COLOR[detailItem.difficulty]}>
              {DIFFICULTY_TAG[detailItem.difficulty]}
            </Tag>
          </Space>

          <Title level={5} style={{ marginTop: 0, lineHeight: 1.6 }}>
            {detailItem.question}
          </Title>

          <Radio.Group
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!!result}
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {OPTION_LABELS.map(
                (key) =>
                  detailItem.options[key] && (
                    <Radio.Button key={key} value={key} style={{ width: "100%", height: "auto" }}>
                      <Text strong>{key}.&nbsp;</Text>
                      {detailItem.options[key]}
                    </Radio.Button>
                  ),
              )}
            </Space>
          </Radio.Group>

          {!result && (
            <Button
              type="primary"
              onClick={submitRePractice}
              loading={submitting}
              disabled={!answer}
            >
              提交答案
            </Button>
          )}

          {result && (
            <>
              <Result
                status={result.isCorrect ? "success" : "error"}
                title={result.isCorrect ? "回答正确" : "回答错误"}
                subTitle={
                  <Space>
                    <Text>正确答案：</Text>
                    <Text strong>{result.correctAnswer}</Text>
                    <Text>你的选择：</Text>
                    <Text strong>{answer}</Text>
                  </Space>
                }
              />
              <Card
                size="small"
                title="解析"
                style={{ background: "var(--sd-bg-secondary, #f5f5f5)" }}
              >
                <Paragraph>{detailItem.explanation}</Paragraph>
              </Card>
              <Button onClick={() => setDetailItem(null)}>返回错题列表</Button>
            </>
          )}
        </Space>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>
            <BookOutlined /> 错题本
          </Title>
          <Select
            showSearch
            allowClear
            placeholder="按章节筛选"
            value={chapter || undefined}
            onChange={(value) => setChapter(value ?? "")}
            options={chapterOptions}
            style={{ minWidth: 240 }}
          />
        </Space>

        {error && (
          <Paragraph>
            <Text type="danger">{error}</Text>
          </Paragraph>
        )}

        {loading ? (
          <Spin tip="加载中…" style={{ display: "block", margin: "40px auto" }} />
        ) : items.length === 0 ? (
          <Empty description="暂无错题，继续保持！" />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 1 }}
            dataSource={items}
            renderItem={(item) => (
              <List.Item>
                <Card
                  size="small"
                  title={
                    <Space wrap>
                      <Tag color={DIFFICULTY_COLOR[item.difficulty]}>
                        {DIFFICULTY_TAG[item.difficulty]}
                      </Tag>
                      <Tag>章节 {item.chapter}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        错于 {new Date(item.errorAt).toLocaleDateString()}
                      </Text>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        size="small"
                        icon={<CheckCircleOutlined />}
                        loading={masteringId === item.id}
                        onClick={() => handleMaster(item.id)}
                      >
                        已掌握
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        icon={<RedoOutlined />}
                        onClick={() => handleRePractice(item)}
                      >
                        重新练习
                      </Button>
                    </Space>
                  }
                >
                  <Paragraph strong>{item.question}</Paragraph>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {OPTION_LABELS.map(
                      (key) =>
                        item.options[key] && (
                          <Text
                            key={key}
                            type={
                              key === item.correctAnswer
                                ? "success"
                                : key === item.selectedAnswer
                                  ? "danger"
                                  : undefined
                            }
                            style={{ display: "block" }}
                          >
                            {key}. {item.options[key]}
                            {key === item.correctAnswer && (
                              <Tag color="success" style={{ marginLeft: 8 }}>
                                正确答案
                              </Tag>
                            )}
                            {key === item.selectedAnswer && (
                              <Tag color="error" style={{ marginLeft: 8 }}>
                                你的答案
                              </Tag>
                            )}
                          </Text>
                        ),
                    )}
                  </Space>
                  <Paragraph type="secondary" style={{ marginTop: 12, fontSize: 13 }}>
                    {item.explanation}
                  </Paragraph>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Space>
    </div>
  );
}
