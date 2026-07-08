import { useEffect, useState, useCallback } from "react";
import { Card, Typography, Rate, Button, Space, Tag, Spin, Empty, Alert } from "antd";
import { apiRequest } from "../api/client";

const { Title, Text, Paragraph } = Typography;

interface ReviewCard {
  cardId: string;
  userId: string;
  knowledgePointId: string;
  ease: number;
  interval: number;
  dueDate: string;
  reps: number;
  lapses: number;
  title: string;
  content: string;
  examWeight: number;
  chapterId: string;
  chapterTitle: string;
}

const labels = ["完全遗忘", "模糊", "勉强想起", "困难", "良好", "简单"];
const weightColors = ["default", "default", "cyan", "blue", "orange", "red"] as const;

export default function ReviewPage() {
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cards = await apiRequest<ReviewCard[]>("/api/review/due");
      setQueue(cards);
      if (cards.length === 0) {
        setFinished(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载复习队列失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const current = queue[0];

  const handleRate = async (score: number) => {
    if (!current) return;
    setSubmitting(true);
    try {
      await apiRequest("/api/review/rate", {
        method: "POST",
        body: JSON.stringify({ cardId: current.cardId, score }),
      });
      setQueue((prev) => prev.slice(1));
      if (queue.length <= 1) {
        setFinished(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交评分失败");
    } finally {
      setSubmitting(false);
    }
  };

  const weightText = (w: number) => `考试权重 ${w}/5`;

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <Title level={2}>
        今日复习
        <Text type="secondary" style={{ marginLeft: 16, fontSize: 16, fontWeight: "normal" }}>
          {finished && queue.length === 0
            ? "已完成全部复习"
            : `剩余 ${queue.length} 张卡片`}
        </Text>
      </Title>

      {error && (
        <Alert
          message={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : finished && queue.length === 0 ? (
        <Empty description="今日没有到期复习卡片" style={{ padding: 48 }} />
      ) : current ? (
        <Card
          title={<Space><span>{current.title}</span><Tag color={weightColors[current.examWeight] ?? "default"}>{weightText(current.examWeight)}</Tag></Space>}
          extra={<Text type="secondary">{current.chapterTitle}</Text>}
          loading={submitting}
        >
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">考试权重: </Text>
              <Rate disabled value={current.examWeight} count={5} />
            </div>
            <Paragraph style={{ fontSize: 16, whiteSpace: "pre-wrap" }}>
              {current.content || "暂无知识点内容"}
            </Paragraph>
          </div>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 24 }}>
            <Title level={5} style={{ marginBottom: 12 }}>
              掌握度评分
            </Title>
            <Space wrap>
              {[0, 1, 2, 3, 4, 5].map((score) => (
                <Button
                  key={score}
                  type={score <= 2 ? "default" : "primary"}
                  danger={score <= 2}
                  loading={submitting}
                  onClick={() => handleRate(score)}
                >
                  {score} — {labels[score]}
                </Button>
              ))}
            </Space>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                0–2 表示遗忘，间隔重置为 1 天；3 困难、4 良好、5 简单按 SM-2 算法推进
              </Text>
            </div>
          </div>
        </Card>
      ) : (
        <Empty description="暂无复习卡片" style={{ padding: 48 }} />
      )}
    </div>
  );
}
