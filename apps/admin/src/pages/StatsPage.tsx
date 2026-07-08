import { useEffect, useMemo, useState } from "react";
import { Card, Flex, Select, Space, Spin, Table, Tag, Typography } from "antd";
import { apiRequest, getAccessToken } from "../api/client";

const { Title, Text } = Typography;

interface ChapterStats {
  chapterId: string;
  chapterName: string;
  total: number;
  correct: number;
  accuracy: number;
  rank?: number;
}

interface KnowledgePointStats {
  knowledgePointId: string;
  knowledgePointName: string;
  chapterId: string;
  chapterName: string;
  total: number;
  correct: number;
  accuracy: number;
  weak: boolean;
}

interface DailyTrend {
  date: string;
  total: number;
  correct: number;
  accuracy: number;
}

const DAYS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "近 7 天", value: "7" },
  { label: "近 30 天", value: "30" },
  { label: "近 90 天", value: "90" },
];

const accuracyColor = (accuracy: number) => {
  if (accuracy >= 80) return "success";
  if (accuracy >= 60) return "warning";
  return "error";
};

export default function StatsPage() {
  const [days, setDays] = useState<string>("");
  const [chapterStats, setChapterStats] = useState<ChapterStats[] | null>(null);
  const [knowledgePointStats, setKnowledgePointStats] = useState<KnowledgePointStats[] | null>(
    null,
  );
  const [trends, setTrends] = useState<DailyTrend[] | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => (days ? `?days=${days}` : ""), [days]);

  const isAuthenticated = Boolean(getAccessToken());

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setChapterStats([]);
      setKnowledgePointStats([]);
      setTrends([]);
      setLoading(false);
    } else {
      setLoading(true);
      void Promise.all([
        apiRequest<ChapterStats[]>(`/stats/chapter${query}`),
        apiRequest<KnowledgePointStats[]>(`/stats/knowledge-point${query}`),
        apiRequest<DailyTrend[]>(`/stats/trends${days ? query : "?days=30"}`),
      ])
        .then(([c, k, t]) => {
          if (cancelled) return;
          setChapterStats(c);
          setKnowledgePointStats(k);
          setTrends(t);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [query, days, isAuthenticated]);

  const chapterColumns = [
    {
      title: "排名",
      dataIndex: "rank",
      key: "rank",
      width: 72,
      render: (rank?: number) => (rank ? rank : "-"),
    },
    {
      title: "章节",
      dataIndex: "chapterName",
      key: "chapterName",
    },
    {
      title: "正确率",
      dataIndex: "accuracy",
      key: "accuracy",
      render: (accuracy: number) => (
        <Tag color={accuracyColor(accuracy)}>{accuracy.toFixed(1)}%</Tag>
      ),
      sorter: (a: ChapterStats, b: ChapterStats) => a.accuracy - b.accuracy,
    },
    {
      title: "做题次数",
      dataIndex: "total",
      key: "total",
      sorter: (a: ChapterStats, b: ChapterStats) => a.total - b.total,
    },
    {
      title: "正确数",
      dataIndex: "correct",
      key: "correct",
    },
  ];

  const knowledgePointColumns = [
    {
      title: "知识点",
      dataIndex: "knowledgePointName",
      key: "knowledgePointName",
    },
    {
      title: "章节",
      dataIndex: "chapterName",
      key: "chapterName",
    },
    {
      title: "正确率",
      dataIndex: "accuracy",
      key: "accuracy",
      render: (accuracy: number) => (
        <Tag color={accuracyColor(accuracy)}>{accuracy.toFixed(1)}%</Tag>
      ),
      sorter: (a: KnowledgePointStats, b: KnowledgePointStats) => a.accuracy - b.accuracy,
    },
    {
      title: "做题次数",
      dataIndex: "total",
      key: "total",
      sorter: (a: KnowledgePointStats, b: KnowledgePointStats) => a.total - b.total,
    },
    {
      title: "状态",
      dataIndex: "weak",
      key: "weak",
      render: (weak: boolean) =>
        weak ? <Tag color="error">薄弱</Tag> : <Tag color="success">良好</Tag>,
    },
  ];

  const latestTrend = trends && trends.length > 0 ? trends[trends.length - 1] : null;

  return (
    <Flex vertical gap="middle" style={{ width: "100%" }}>
      <Title level={4}>练习统计</Title>
      <Space>
        <Text>时间维度：</Text>
        <Select value={days} onChange={setDays} options={DAYS_OPTIONS} style={{ width: 120 }} />
      </Space>
      {!isAuthenticated ? (
        <Card>
          <Text type="secondary">请先登录后查看练习统计。</Text>
        </Card>
      ) : (
        <Spin spinning={loading}>
          <Card title="趋势概览" size="small">
            {latestTrend ? (
              <Space>
                <Text>
                  最近一日 {latestTrend.date}：{latestTrend.total} 题，正确率{" "}
                  {latestTrend.accuracy.toFixed(1)}%
                </Text>
                {latestTrend.total === 0 && <Tag color="default">暂无数据</Tag>}
              </Space>
            ) : (
              <Text type="secondary">暂无趋势数据</Text>
            )}
          </Card>
          <Card title="章节正确率" size="small" style={{ marginTop: 16 }}>
            <Table
              rowKey="chapterId"
              dataSource={chapterStats ?? []}
              columns={chapterColumns}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
          <Card title="知识点薄弱度" size="small" style={{ marginTop: 16 }}>
            <Table
              rowKey="knowledgePointId"
              dataSource={knowledgePointStats ?? []}
              columns={knowledgePointColumns}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Spin>
      )}
    </Flex>
  );
}
