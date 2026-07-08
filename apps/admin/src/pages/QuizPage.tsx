import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Card,
  Form,
  Radio,
  Result,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  fetchWithAuth,
  apiRequest,
  getAccessToken,
} from "../api/client";

const { Title, Text, Paragraph } = Typography;

interface Question {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  year: number;
}

interface SubmitResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

interface ChapterMeta {
  id: string;
  title: string;
  section: string;
  examWeight: number;
  order: number;
}

const MODE_LABELS: Record<string, string> = {
  chapter: "章节练习",
  random: "随机练习",
  error: "错题重练",
};

const OPTION_LABELS = ["A", "B", "C", "D"];

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

export default function QuizPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"chapter" | "random" | "error">("random");
  const [chapter, setChapter] = useState<string>("");
  const [count, setCount] = useState<number>(20);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/knowledge/chapters")
      .then(async (res) => {
        if (!res.ok) throw new Error("加载章节失败");
        return (await res.json()) as { chapters: ChapterMeta[] };
      })
      .then((data) => setChapters(data.chapters))
      .catch(() => setChapters([]));
  }, []);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("mode", mode);
      params.set("count", String(count));
      if (mode === "chapter" && chapter) params.set("chapter", chapter);
      const qs = await apiRequest<Question[]>(`/api/quiz/questions?${params.toString()}`);
      if (qs.length === 0) {
        setError("当前条件下没有可用题目。");
        return;
      }
      setQuestions(qs);
      setIndex(0);
      setAnswer(null);
      setResult(null);
      setStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "出题失败");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!answer) return;
    setSubmitting(true);
    try {
      const res = await apiRequest<SubmitResult>("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: questions[index].id,
          selectedAnswer: answer,
        }),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setStarted(false);
      setQuestions([]);
      setIndex(0);
      setAnswer(null);
      setResult(null);
      return;
    }
    setIndex((i) => i + 1);
    setAnswer(null);
    setResult(null);
  };

  const chapterOptions = useMemo(
    () =>
      chapters.map((c) => ({
        value: c.id,
        label: `${c.title}（${c.id}）`,
      })),
    [chapters],
  );

  const current = questions[index];

  if (!started) {
    return (
      <Card style={{ maxWidth: 720, margin: "24px auto" }}>
        <Title level={4} style={{ marginTop: 0 }}>
          选择题练习
        </Title>
        <Form layout="vertical">
          <Form.Item label="练习模式">
            <Select
              value={mode}
              onChange={(value) => {
                setMode(value);
                if (value !== "chapter") setChapter("");
              }}
              options={[
                { value: "chapter", label: "章节练习" },
                { value: "random", label: "随机练习" },
                { value: "error", label: "错题重练" },
              ]}
              style={{ width: "100%" }}
            />
          </Form.Item>
          {mode === "chapter" && (
            <Form.Item label="选择章节">
              <Select
                showSearch
                value={chapter || undefined}
                placeholder="请选择章节"
                onChange={setChapter}
                options={chapterOptions}
                style={{ width: "100%" }}
              />
            </Form.Item>
          )}
          <Form.Item label="题目数量">
            <Select
              value={count}
              onChange={setCount}
              options={[
                { value: 10, label: "10 题" },
                { value: 20, label: "20 题" },
                { value: 50, label: "50 题" },
              ]}
              style={{ width: "100%" }}
            />
          </Form.Item>
          {error && (
            <Paragraph>
              <Text type="danger">{error}</Text>
            </Paragraph>
          )}
          <Button
            type="primary"
            onClick={start}
            loading={loading}
            disabled={mode === "chapter" && !chapter}
          >
            开始练习
          </Button>
        </Form>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card style={{ maxWidth: 720, margin: "24px auto" }}>
        <Text type="secondary">题目加载中…</Text>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 720, margin: "24px auto" }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap>
          <Tag color="blue">{MODE_LABELS[mode]}</Tag>
          <Tag>章节 {current.chapter}</Tag>
          <Tag color={DIFFICULTY_COLOR[current.difficulty]}>
            {DIFFICULTY_TAG[current.difficulty]}
          </Tag>
          <Tag color="default">
            {index + 1} / {questions.length}
          </Tag>
        </Space>

        <Title level={5} style={{ marginTop: 0, lineHeight: 1.6 }}>
          {current.question}
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
                current.options[key] && (
                  <Radio.Button key={key} value={key} style={{ width: "100%", height: "auto" }}>
                    <Text strong>{key}.&nbsp;</Text>
                    {current.options[key]}
                  </Radio.Button>
                ),
            )}
          </Space>
        </Radio.Group>

        {!result && (
          <Button
            type="primary"
            onClick={submit}
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
              <Paragraph style={{ margin: 0 }}>{result.explanation}</Paragraph>
              <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                <Text type="secondary">章节定位：{current.chapter}</Text>
              </Paragraph>
            </Card>
            <Button type="primary" onClick={next}>
              {index + 1 >= questions.length ? "完成练习" : "下一题"}
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
}
