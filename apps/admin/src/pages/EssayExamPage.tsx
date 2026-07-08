import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Card,
  Divider,
  Input,
  List,
  Progress,
  Result,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from "antd";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface EssayQuestion {
  id: string;
  title: string;
  requirements: string[];
  referenceOutline?: string;
  source: string;
  year: number | null;
  hash: string;
}

interface Paper {
  examId: string;
  questions: EssayQuestion[];
  duration: number;
  remainingTime: number;
}

interface Dimension {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  comment: string;
}

interface SectionFeedback {
  section: string;
  comment: string;
  suggestions: string[];
}

interface Deduction {
  reason: string;
  severity: "minor" | "major" | "critical";
  suggestion: string;
}

interface ExamReport {
  examId: string;
  score: number;
  total: number;
  passLine: number;
  passed: boolean;
  duration: number;
  writingId: string;
  selectedQuestionId: string;
  dimensions: Dimension[];
  sectionFeedbacks: SectionFeedback[];
  deductions: Deduction[];
  overallComment: string;
  improvementSuggestions: string[];
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

const EMPTY_SECTIONS: ThesisSections = {
  summary: "",
  background: "",
  solution: "",
  reflection: "",
  conclusion: "",
};

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function EssayExamPage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [sections, setSections] = useState<ThesisSections>(EMPTY_SECTIONS);
  const [remaining, setRemaining] = useState(0);
  const [started, setStarted] = useState(false);
  const [report, setReport] = useState<ExamReport | null>(null);
  const [activeTab, setActiveTab] = useState<ThesisSectionKey>("summary");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const selectedQuestionIdRef = useRef(selectedQuestionId);
  selectedQuestionIdRef.current = selectedQuestionId;
  const examIdRef = useRef(examId);
  examIdRef.current = examId;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const totalWords = useMemo(() => countTotalWords(sections), [sections]);

  // Start or resume essay exam on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { active } = await apiRequest<{ active: ActiveExam | null }>("/api/exam/status");
        if (active?.examType === "essay" && active.status === "in_progress") {
          setExamId(active.id);
          setRemaining(active.remainingTime);
          const snap = active.answersSnapshot as {
            selectedQuestionId?: string;
            sections?: ThesisSections;
          };
          if (snap.selectedQuestionId) {
            setSelectedQuestionId(snap.selectedQuestionId);
          }
          if (snap.sections) {
            setSections({ ...EMPTY_SECTIONS, ...snap.sections });
          }
          loadPaper(active.id);
        } else {
          const res = await apiRequest<ActiveExam>("/api/exam/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examType: "essay", mode: "single" }),
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
      const p = await apiRequest<Paper>(`/api/exam/essay/paper?examId=${id}`);
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

  // Autosave debounce (30s)
  useEffect(() => {
    if (!dirty || !examId || !selectedQuestionId) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
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
  }, [dirty, sections, selectedQuestionId, examId]);

  const doSubmit = async (
    manual: boolean,
    sectionOverride?: ThesisSections,
    questionOverride?: string,
  ): Promise<void> => {
    const targetExamId = examIdRef.current;
    const targetQuestionId = questionOverride ?? selectedQuestionIdRef.current;
    const targetSections = sectionOverride ?? sectionsRef.current;
    if (!targetExamId || !targetQuestionId) return;
    if (!dirtyRef.current && !manual) return;
    setSaving(true);
    try {
      await apiRequest("/api/exam/essay/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: targetExamId,
          selectedQuestionId: targetQuestionId,
          sections: targetSections,
        }),
      });
      if (!questionOverride) {
        setDirty(false);
      }
      if (manual) {
        message.success("已保存");
      }
    } catch (err) {
      if (manual) {
        message.error(err instanceof Error ? err.message : "保存失败");
      }
    } finally {
      setSaving(false);
    }
  };

  const finishExam = async () => {
    if (!examId || report) return;
    setLoading(true);
    try {
      // Force sync latest content before finishing
      await doSubmit(true, sectionsRef.current, selectedQuestionIdRef.current);
      const r = await apiRequest<ExamReport>("/api/exam/essay/finish", {
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

  const handleSelectQuestion = async (id: string) => {
    if (selectedQuestionId === id) return;
    if (selectedQuestionId && dirty) {
      // Flush pending autosave with the *current* question before switching
      await doSubmit(false, sectionsRef.current, selectedQuestionIdRef.current);
    }
    setSelectedQuestionId(id);
    setSections(EMPTY_SECTIONS);
    setDirty(true);
    setActiveTab("summary");
  };

  const patchSection = (key: ThesisSectionKey, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const selectedQuestion = useMemo(() => {
    return paper?.questions.find((q) => q.id === selectedQuestionId) ?? null;
  }, [paper, selectedQuestionId]);

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
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Result
            status={report.passed ? "success" : "warning"}
            title={`论文模拟考成绩：${report.score} / ${report.total}`}
            subTitle={
              <Space>
                <Text>{report.passed ? "恭喜，已达到合格线" : "未达合格线，继续加油"}</Text>
                <Text type="secondary">合格线：{report.passLine} 分</Text>
                <Text type="secondary">用时：{formatSeconds(report.duration)}</Text>
              </Space>
            }
          />

          <Title level={5}>五维度评分</Title>
          <List
            dataSource={report.dimensions}
            renderItem={(d) => (
              <List.Item>
                <Card style={{ width: "100%" }} size="small">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Space>
                      <Text strong>{d.name}</Text>
                      <Tag color={d.score >= d.maxScore * 0.6 ? "success" : "warning"}>
                        {d.score} / {d.maxScore}（权重 {d.weight}%）
                      </Tag>
                    </Space>
                    <Progress
                      percent={Math.round((d.score / d.maxScore) * 100)}
                      status={d.score >= d.maxScore * 0.6 ? "success" : "exception"}
                      size="small"
                    />
                    <Text type="secondary">{d.comment}</Text>
                  </Space>
                </Card>
              </List.Item>
            )}
          />

          {report.deductions.length > 0 && (
            <>
              <Title level={5}>扣分项</Title>
              <List
                dataSource={report.deductions}
                renderItem={(d) => (
                  <List.Item>
                    <Card style={{ width: "100%" }} size="small">
                      <Space direction="vertical">
                        <Space>
                          <Text strong>{d.reason}</Text>
                          <Tag
                            color={
                              d.severity === "critical"
                                ? "error"
                                : d.severity === "major"
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {d.severity}
                          </Tag>
                        </Space>
                        <Text type="secondary">{d.suggestion}</Text>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            </>
          )}

          <Title level={5}>逐段点评</Title>
          <List
            dataSource={report.sectionFeedbacks}
            renderItem={(sf) => (
              <List.Item>
                <Card style={{ width: "100%" }} size="small">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text strong>{sf.section}</Text>
                    <Text>{sf.comment}</Text>
                    {sf.suggestions.length > 0 && (
                      <ul>
                        {sf.suggestions.map((s, i) => (
                          <li key={i}>
                            <Text type="secondary">{s}</Text>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Space>
                </Card>
              </List.Item>
            )}
          />

          <Title level={5}>总体评价</Title>
          <Card size="small">
            <Paragraph>{report.overallComment}</Paragraph>
          </Card>

          <Title level={5}>改进建议</Title>
          <List
            dataSource={report.improvementSuggestions}
            renderItem={(s) => (
              <List.Item>
                <Text>• {s}</Text>
              </List.Item>
            )}
          />

          <Button type="primary" onClick={() => navigate("/exam")}>
            返回模拟考首页
          </Button>
        </Space>
      </Card>
    );
  }

  // Question selection phase
  if (!selectedQuestionId) {
    return (
      <Card style={{ maxWidth: 960, margin: "24px auto" }} loading={loading}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Title level={4}>
            <FileTextOutlined /> 论文模拟考（4 选 1）
          </Title>
          <Text type="secondary">请选择一道论文题目，倒计时将在选题后开始</Text>
          <Divider />
          <List
            dataSource={paper?.questions ?? []}
            renderItem={(q) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => handleSelectQuestion(q.id)}
                  style={{ width: "100%", cursor: "pointer" }}
                >
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text strong>{q.title}</Text>
                    {q.requirements.length > 0 && (
                      <ul>
                        {q.requirements.map((r, i) => (
                          <li key={i}>
                            <Text type="secondary">{r}</Text>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Space>
                      <Tag>{q.source}</Tag>
                      {q.year && <Tag>{q.year} 年</Tag>}
                    </Space>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        </Space>
      </Card>
    );
  }

  // Writing phase
  const sectionItems = THESIS_SECTIONS.map((key) => {
    const meta = THESIS_SECTION_TARGETS[key];
    const count = countWords(sections[key]);
    const inRange = count >= meta.min && count <= meta.max;
    const tagColor = count === 0 ? "default" : inRange ? "success" : "warning";
    return {
      key,
      label: (
        <Space size={6}>
          <span>{meta.label}</span>
          <Tag color={tagColor} style={{ marginInlineEnd: 0 }}>
            {count}
          </Tag>
        </Space>
      ),
      children: (
        <div style={{ padding: "8px 0" }}>
          <TextArea
            rows={12}
            value={sections[key]}
            onChange={(e) => patchSection(key, e.target.value)}
            placeholder={`请输入${meta.label}内容（建议 ${meta.min}-${meta.max} 字）`}
            showCount
          />
        </div>
      ),
    };
  });

  const totalTag = (() => {
    if (totalWords < THESIS_TOTAL_TARGET.min) return <Tag color="warning">未达标</Tag>;
    if (totalWords > THESIS_TOTAL_TARGET.max) return <Tag color="error">超标</Tag>;
    return <Tag color="success">达标</Tag>;
  })();

  return (
    <Card
      loading={loading}
      title={
        <Space size="middle" wrap>
          <FileTextOutlined />
          <Title level={4} style={{ margin: 0 }}>
            论文模拟考
          </Title>
          <Text type="secondary">{selectedQuestion?.title}</Text>
        </Space>
      }
      extra={
        <Space size="middle" wrap>
          <Statistic
            title="剩余时间"
            value={formatSeconds(remaining)}
            valueStyle={{
              color: remaining < 600 ? token.colorError : token.colorText,
              fontFamily: "monospace",
            }}
          />
          <Button onClick={() => doSubmit(true)} loading={saving}>
            保存草稿
          </Button>
          <Button type="primary" danger onClick={() => finishExam()}>
            交卷
          </Button>
        </Space>
      }
    >
      {selectedQuestion?.requirements.length ? (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Text strong>写作要求：</Text>
          <ul>
            {selectedQuestion.requirements.map((r, i) => (
              <li key={i}>
                <Text>{r}</Text>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ThesisSectionKey)}
        items={sectionItems}
        destroyOnHidden={false}
      />

      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 8,
          background: "var(--ant-color-bg-elevated)",
          border: "1px solid var(--ant-color-border-secondary)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Space size={6}>
          <Text strong>总字数</Text>
          <Text style={{ fontVariantNumeric: "tabular-nums" }}>
            {totalWords} / {THESIS_TOTAL_TARGET.min}-{THESIS_TOTAL_TARGET.max}
          </Text>
          {totalTag}
        </Space>
        <div style={{ flex: 1 }} />
        <Text type="secondary">{dirty ? "未保存" : "已保存"}</Text>
      </div>
    </Card>
  );
}
