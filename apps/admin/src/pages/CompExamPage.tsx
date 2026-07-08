import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Card,
  Flex,
  List,
  Pagination,
  Radio,
  Result,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import { apiRequest } from "../api/client";

const { Title, Text, Paragraph } = Typography;

interface Question {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  difficulty: string;
  source: string;
  year: number | null;
}

interface Paper {
  examId: string;
  questions: Question[];
  duration: number;
  remainingTime: number;
}

interface ChapterStat {
  chapter: string;
  total: number;
  correct: number;
  rate: number;
}

interface WrongQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  correctAnswer: string;
  userAnswer: string;
  explanation: string;
}

interface ExamReport {
  examId: string;
  score: number;
  total: number;
  passLine: number;
  passed: boolean;
  duration: number;
  chapterDistribution: ChapterStat[];
  wrongQuestions: WrongQuestion[];
}

interface ActiveExam {
  id: string;
  examType: string;
  mode: string;
  status: string;
  duration: number;
  remainingTime: number;
  answersSnapshot: Record<string, unknown>;
  startedAt: string;
}

const TOTAL_QUESTIONS = 75;

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CompExamPage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [started, setStarted] = useState(false);
  const [report, setReport] = useState<ExamReport | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start or resume a comprehensive exam on mount.
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { active } = await apiRequest<{ active: ActiveExam | null }>("/api/exam/status");
        if (active?.examType === "comprehensive" && active.status === "in_progress") {
          setExamId(active.id);
          setRemaining(active.remainingTime);
          loadPaper(active.id);
        } else {
          const res = await apiRequest<ActiveExam>("/api/exam/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examType: "comprehensive", mode: "single" }),
          });
          setExamId(res.id);
          setRemaining(res.remainingTime);
          loadPaper(res.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "启动考试失败");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPaper = async (id: string) => {
    try {
      const p = await apiRequest<Paper>(`/api/exam/comp/paper?examId=${id}`);
      setPaper(p);
      setStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载试卷失败");
    }
  };

  // Timer countdown
  useEffect(() => {
    if (started && remaining > 0 && !report) {
      timerRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            finishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [started, remaining, report]);

  const currentQuestion = useMemo(() => {
    return paper?.questions[currentIndex] ?? null;
  }, [paper, currentIndex]);

  const answerCount = useMemo(() => Object.keys(answers).length, [answers]);

  const submitAnswer = async (questionId: string, value: string) => {
    if (!examId) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    try {
      await apiRequest("/api/exam/comp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, questionId, answer: value }),
      });
    } catch {
      // local answer already updated; server sync failure will not block UI
    }
  };

  const finishExam = async () => {
    if (!examId || report) return;
    setLoading(true);
    try {
      // sync latest answers to server snapshot
      await apiRequest("/api/exam/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          remainingTime: Math.max(0, remaining),
          answersSnapshot: { answers },
        }),
      });
      const r = await apiRequest<ExamReport>("/api/exam/comp/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      setReport(r);
      setStarted(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  };

  const questionNavItems = useMemo(() => {
    return (
      paper?.questions.map((q, idx) => ({
        key: idx,
        label: `第 ${idx + 1} 题`,
        answered: !!answers[q.id],
      })) ?? []
    );
  }, [paper, answers]);

  if (error) {
    return (
      <Card style={{ maxWidth: 720, margin: "24px auto" }}>
        <Result status="error" title="考试加载失败" subTitle={error} />
      </Card>
    );
  }

  if (report) {
    return (
      <Card style={{ maxWidth: 960, margin: "24px auto" }}>
        <Flex vertical gap="large" style={{ width: "100%" }}>
          <Result
            status={report.passed ? "success" : "warning"}
            title={`综合知识模拟考成绩：${report.score} / ${report.total}`}
            subTitle={
              <Space>
                <Text>{report.passed ? "恭喜，已达到合格线" : "未达合格线，继续加油"}</Text>
                <Text type="secondary">合格线：{report.passLine} 分</Text>
                <Text type="secondary">用时：{formatSeconds(report.duration)}</Text>
              </Space>
            }
          />
          <Title level={5}>章节得分分布</Title>
          <Table
            dataSource={report.chapterDistribution}
            rowKey="chapter"
            pagination={false}
            columns={[
              { title: "章节", dataIndex: "chapter", key: "chapter" },
              { title: "题数", dataIndex: "total", key: "total" },
              { title: "正确", dataIndex: "correct", key: "correct" },
              {
                title: "正确率",
                dataIndex: "rate",
                key: "rate",
                render: (rate: number) => `${rate}%`,
              },
            ]}
          />
          <Title level={5}>错题列表（共 {report.wrongQuestions.length} 道）</Title>
          <List
            dataSource={report.wrongQuestions}
            renderItem={(wq) => (
              <List.Item>
                <Card style={{ width: "100%" }}>
                  <Flex vertical gap="small" style={{ width: "100%" }}>
                    <Text strong>
                      {wq.question}
                      <Tag style={{ marginLeft: 8 }}>{wq.chapter}</Tag>
                    </Text>
                    <Text type="secondary">
                      你的答案：{wq.userAnswer || "未作答"} / 正确答案：{wq.correctAnswer}
                    </Text>
                    <Paragraph>
                      <Text strong>解析：</Text>
                      {wq.explanation}
                    </Paragraph>
                  </Flex>
                </Card>
              </List.Item>
            )}
          />
          <Button type="primary" onClick={() => navigate("/exam")}>
            返回模拟考首页
          </Button>
        </Flex>
      </Card>
    );
  }

  if (!paper || !currentQuestion) {
    return (
      <Card style={{ maxWidth: 720, margin: "24px auto" }} loading={loading}>
        <Title level={4}>综合知识模拟考</Title>
        <Text type="secondary">正在加载试卷…</Text>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 1200, margin: "24px auto" }}>
      <Flex vertical gap="large" style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap" }}>
          <Title level={4} style={{ margin: 0 }}>
            综合知识模拟考
          </Title>
          <Space>
            <Text type="secondary">
              已答 {answerCount} / {TOTAL_QUESTIONS}
            </Text>
            <Statistic
              title="剩余时间"
              value={formatSeconds(remaining)}
              styles={{
                content: {
                  color: remaining < 300 ? token.colorError : token.colorText,
                  fontFamily: "monospace",
                  fontSize: 24,
                },
              }}
            />
          </Space>
        </Space>

        <Space align="start" style={{ width: "100%", alignItems: "stretch" }} wrap>
          {/* Question navigation */}
          <Card
            title="题号导航"
            style={{ width: 220, minWidth: 220 }}
            bodyStyle={{ padding: 12, maxHeight: 520, overflow: "auto" }}
          >
            <Pagination
              simple
              current={currentIndex + 1}
              total={TOTAL_QUESTIONS}
              pageSize={1}
              onChange={(page) => setCurrentIndex(page - 1)}
              style={{ marginBottom: 16 }}
            />
            <List
              grid={{ gutter: 8, column: 4 }}
              dataSource={questionNavItems}
              renderItem={(item) => (
                <List.Item>
                  <Button
                    size="small"
                    type={
                      currentIndex === item.key ? "primary" : item.answered ? "default" : "dashed"
                    }
                    style={{
                      width: "100%",
                      backgroundColor: item.answered ? token.colorSuccessBg : undefined,
                    }}
                    onClick={() => setCurrentIndex(item.key)}
                  >
                    {item.key + 1}
                  </Button>
                </List.Item>
              )}
            />
          </Card>

          {/* Question card */}
          <Card style={{ flex: 1, minWidth: 320 }}>
            <Flex vertical gap="small" style={{ width: "100%" }}>
              <Text type="secondary">
                第 {currentIndex + 1} 题 / 共 {TOTAL_QUESTIONS} 题
                <Tag style={{ marginLeft: 8 }}>{currentQuestion.chapter}</Tag>
              </Text>
              <Paragraph style={{ fontSize: 16, whiteSpace: "pre-wrap" }}>
                {currentQuestion.question}
              </Paragraph>
              <Radio.Group
                value={answers[currentQuestion.id] ?? null}
                onChange={(e) => submitAnswer(currentQuestion.id, e.target.value)}
                style={{ width: "100%" }}
              >
                <Flex vertical gap="small" style={{ width: "100%" }}>
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <Radio key={key} value={key}>
                      {key}. {value}
                    </Radio>
                  ))}
                </Flex>
              </Radio.Group>
            </Flex>
          </Card>
        </Space>

        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Button disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>
            上一题
          </Button>
          <Button
            disabled={currentIndex === TOTAL_QUESTIONS - 1}
            onClick={() => setCurrentIndex((i) => i + 1)}
          >
            下一题
          </Button>
        </Space>

        <Button type="primary" danger size="large" onClick={finishExam} loading={loading}>
          提交试卷
        </Button>
      </Flex>
    </Card>
  );
}
