import { useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Radio,
  Space,
  Statistic,
  Tag,
  Typography,
  theme,
} from "antd";
import { apiRequest } from "../api/client";

const { Title, Text, Paragraph } = Typography;

type ExamType = "comprehensive" | "case" | "essay" | "full";
type ExamMode = "single" | "full";

interface ExamConfig {
  examType: Exclude<ExamType, "full">;
  questionCount: number;
  duration: number;
  chooseCount?: number;
}

interface ActiveExam {
  id: string;
  examType: ExamType;
  mode: ExamMode;
  status: string;
  duration: number;
  remainingTime: number;
  answersSnapshot: Record<string, unknown>;
  startedAt: string;
}

const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  comprehensive: "综合知识",
  case: "案例分析",
  essay: "论文",
  full: "全模块",
};

const EXAM_TYPE_DESC: Record<ExamType, string> = {
  comprehensive: "75 题单选，150 分钟",
  case: "5 选 4 主观题，90 分钟",
  essay: "4 选 1 写作，120 分钟",
  full: "综合 + 案例连续 240 分钟，论文单独 120 分钟",
};

const MODE_LABEL: Record<ExamMode, string> = {
  single: "单模块",
  full: "全模块",
};

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamModePage() {
  const navigate = useNavigate();
  const { token } = theme.useToken();

  const [configs, setConfigs] = useState<ExamConfig[]>([]);
  const [mode, setMode] = useState<ExamMode>("single");
  const [singleType, setSingleType] = useState<Exclude<ExamType, "full">>("comprehensive");
  const [active, setActive] = useState<ActiveExam | null>(null);
  const [started, setStarted] = useState(false);
  const [exam, setExam] = useState<ActiveExam | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    apiRequest<ExamConfig[]>("/api/exam/config")
      .then(setConfigs)
      .catch(() => setConfigs([]));
    apiRequest<{ active: ActiveExam | null }>("/api/exam/status")
      .then((res) => setActive(res.active))
      .catch(() => setActive(null));
  }, []);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const examType = mode === "single" ? singleType : "full";
      const res = await apiRequest<ActiveExam>("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType, mode }),
      });
      if (res.examType === "comprehensive") {
        navigate("/exam/comp");
        return;
      }
      setExam(res);
      setRemaining(res.remainingTime);
      setStarted(true);
      setPaused(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "启动失败");
    } finally {
      setLoading(false);
    }
  };

  const resume = async (examId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<ActiveExam>("/api/exam/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });
      if (res.examType === "comprehensive") {
        navigate("/exam/comp");
        return;
      }
      setExam(res);
      setRemaining(res.remainingTime);
      setStarted(true);
      setPaused(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "恢复失败");
    } finally {
      setLoading(false);
    }
  };

  const pause = async () => {
    if (!exam) return;
    setLoading(true);
    try {
      const snapshot = exam.answersSnapshot;
      await apiRequest<{ id: string; status: string; remainingTime: number }>("/api/exam/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          remainingTime: remaining,
          answersSnapshot: snapshot,
        }),
      });
      setPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "暂停失败");
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    if (!exam) return;
    setLoading(true);
    try {
      await apiRequest<{ id: string; status: string; score: number | null; finishedAt: string }>(
        "/api/exam/finish",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examId: exam.id, answersSnapshot: exam.answersSnapshot }),
        },
      );
      setStarted(false);
      setExam(null);
      setRemaining(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      apiRequest<{ active: ActiveExam | null }>("/api/exam/status")
        .then((res) => setActive(res.active))
        .catch(() => setActive(null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (started && !paused && remaining > 0) {
      timerRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            // auto finish when time runs out
            finish();
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
  }, [started, paused, remaining]);

  const renderSelector = () => (
    <Card style={{ maxWidth: 720, margin: "24px auto" }}>
      <Title level={4} style={{ marginTop: 0 }}>
        模拟考
      </Title>
      <Form layout="vertical">
        <Form.Item label="考试模式">
          <Radio.Group
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            options={[
              { value: "single", label: "单模块" },
              { value: "full", label: "全模块" },
            ]}
          />
        </Form.Item>
        {mode === "single" && (
          <Form.Item label="选择科目">
            <Radio.Group
              value={singleType}
              onChange={(e) => setSingleType(e.target.value)}
              options={configs.map((c) => ({
                value: c.examType,
                label: `${EXAM_TYPE_LABEL[c.examType]}（${EXAM_TYPE_DESC[c.examType]}）`,
              }))}
            />
          </Form.Item>
        )}
        {mode === "full" && (
          <Paragraph>
            <Text type="secondary">
              全模块模式：综合知识（150 分钟）+ 案例分析（90 分钟）连续进行，共 240 分钟。 论文（120
              分钟）可单独选择。
            </Text>
          </Paragraph>
        )}
        {error && (
          <Paragraph>
            <Text type="danger">{error}</Text>
          </Paragraph>
        )}
        <Space>
          <Button type="primary" onClick={start} loading={loading}>
            开始考试
          </Button>
          {active && (
            <Button onClick={() => resume(active.id)} loading={loading}>
              继续上次考试（{EXAM_TYPE_LABEL[active.examType]}）
            </Button>
          )}
        </Space>
      </Form>
    </Card>
  );

  const renderExam = () => {
    if (!exam) return null;
    const typeLabel = EXAM_TYPE_LABEL[exam.examType];
    return (
      <Card style={{ maxWidth: 960, margin: "24px auto" }}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <Title level={4} style={{ margin: 0 }}>
              {typeLabel}模拟考
            </Title>
            <Statistic
              title="剩余时间"
              value={formatSeconds(remaining)}
              valueStyle={{
                color: remaining < 300 ? token.colorError : token.colorText,
                fontFamily: "monospace",
                fontSize: 24,
              }}
            />
          </Space>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="模式">{MODE_LABEL[exam.mode]}</Descriptions.Item>
            <Descriptions.Item label="科目">{typeLabel}</Descriptions.Item>
            <Descriptions.Item label="总时长">{exam.duration} 分钟</Descriptions.Item>
            <Descriptions.Item label="状态">
              {paused ? <Tag color="warning">已暂停</Tag> : <Tag color="processing">进行中</Tag>}
            </Descriptions.Item>
          </Descriptions>
          <Space>
            {paused ? (
              <Button type="primary" onClick={() => resume(exam.id)} loading={loading}>
                继续
              </Button>
            ) : (
              <Button onClick={pause} loading={loading}>
                暂停
              </Button>
            )}
            <Button type="primary" danger onClick={finish} loading={loading}>
              提交
            </Button>
          </Space>
          <Paragraph>
            <Text type="secondary">
              答题界面将在后续迭代中实现。当前页面展示模式选择、计时与暂停/继续功能。
            </Text>
          </Paragraph>
        </Space>
      </Card>
    );
  };

  return <div style={{ padding: token.padding }}>{started ? renderExam() : renderSelector()}</div>;
}
