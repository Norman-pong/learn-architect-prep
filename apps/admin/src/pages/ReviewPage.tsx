import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Empty, List, Rate, Space, Spin, Tag, Typography, theme } from "antd";

import { apiRequest } from "../api/client";
import { ANNOTATION_META, listAnnotations, type Annotation } from "../lib/annotations-api";

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
const weightColors = ["default", "default", "default", "processing", "warning", "error"] as const;

function weightText(w: number): string {
  return `考试权重 ${w}/5`;
}

function sortAnnotations(a: Annotation, b: Annotation): number {
  const aStart = a.startOffset ?? Number.MAX_SAFE_INTEGER;
  const bStart = b.startOffset ?? Number.MAX_SAFE_INTEGER;
  if (aStart !== bStart) return aStart - bStart;
  return a.createdAt.localeCompare(b.createdAt);
}

function getAnnotationRangeText(content: string, annotation: Annotation): string {
  if (
    annotation.startOffset === null ||
    annotation.endOffset === null ||
    annotation.startOffset < 0 ||
    annotation.endOffset <= annotation.startOffset ||
    annotation.endOffset > content.length
  ) {
    return annotation.content;
  }
  return content.slice(annotation.startOffset, annotation.endOffset);
}

export default function ReviewPage() {
  const { token } = theme.useToken();
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
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

  useEffect(() => {
    if (!current) {
      setAnnotations([]);
      return;
    }

    let cancelled = false;
    setLoadingAnnotations(true);
    listAnnotations(current.knowledgePointId)
      .then((items) => {
        if (!cancelled) setAnnotations(items.toSorted(sortAnnotations));
      })
      .catch(() => {
        if (!cancelled) setAnnotations([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAnnotations(false);
      });

    return () => {
      cancelled = true;
    };
  }, [current?.knowledgePointId]);

  const handleRate = async (score: number) => {
    if (!current) return;
    setSubmitting(true);
    try {
      await apiRequest("/api/review/rate", {
        headers: { "Content-Type": "application/json" },
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

  const renderAnnotationReview = () => {
    if (!current) return null;
    return (
      <Card
        size="small"
        title="复习标注"
        extra={<Tag color="default">{annotations.length}</Tag>}
        loading={loadingAnnotations}
        style={{ marginBottom: token.marginLG }}
      >
        {annotations.length === 0 ? (
          <Text type="secondary">这个知识点还没有高亮、笔记或疑问。</Text>
        ) : (
          <List
            size="small"
            dataSource={annotations}
            renderItem={(annotation) => {
              const meta = ANNOTATION_META[annotation.type];
              const selectedText = getAnnotationRangeText(current.content, annotation);
              return (
                <List.Item>
                  <Space direction="vertical" size={token.marginXXS} style={{ width: "100%" }}>
                    <Space size={token.marginXS} wrap>
                      <Tag color={meta.color}>{meta.label}</Tag>
                      <Text type="secondary">{selectedText}</Text>
                    </Space>
                    {annotation.type !== "highlight" && <Text>{annotation.content}</Text>}
                  </Space>
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: token.paddingLG, maxWidth: 960, margin: "0 auto" }}>
      <Title level={2}>
        今日复习
        <Text
          type="secondary"
          style={{ marginLeft: token.margin, fontSize: 16, fontWeight: "normal" }}
        >
          {finished && queue.length === 0 ? "已完成全部复习" : `剩余 ${queue.length} 张卡片`}
        </Text>
      </Title>

      {error && (
        <Alert
          message={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: token.margin }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: token.paddingXXL }}>
          <Spin size="large" />
        </div>
      ) : finished && queue.length === 0 ? (
        <Empty description="今日没有到期复习卡片" style={{ padding: token.paddingXXL }} />
      ) : current ? (
        <Card
          title={
            <Space>
              <span>{current.title}</span>
              <Tag color={weightColors[current.examWeight] ?? "default"}>
                {weightText(current.examWeight)}
              </Tag>
            </Space>
          }
          extra={<Text type="secondary">{current.chapterTitle}</Text>}
          loading={submitting}
        >
          {renderAnnotationReview()}

          <div style={{ marginBottom: token.marginLG }}>
            <div style={{ marginBottom: token.marginSM }}>
              <Text type="secondary">考试权重: </Text>
              <Rate disabled value={current.examWeight} count={5} />
            </div>
            <Paragraph style={{ fontSize: 16, whiteSpace: "pre-wrap" }}>
              {current.content || "暂无知识点内容"}
            </Paragraph>
          </div>

          <div
            style={{
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              paddingTop: token.paddingLG,
            }}
          >
            <Title level={5} style={{ marginBottom: token.marginSM }}>
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
            <div style={{ marginTop: token.marginSM }}>
              <Text type="secondary">
                0–2 表示遗忘，间隔重置为 1 天；3 困难、4 良好、5 简单按 SM-2 算法推进
              </Text>
            </div>
          </div>
        </Card>
      ) : (
        <Empty description="暂无复习卡片" style={{ padding: token.paddingXXL }} />
      )}
    </div>
  );
}
