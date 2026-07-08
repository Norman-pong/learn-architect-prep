import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Empty,
  Flex,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { TrophyOutlined } from "@ant-design/icons";
import { apiRequest } from "../api/client";

const { Title, Text } = Typography;

type ExamType = "comprehensive" | "case" | "essay";

interface HistoryItem {
  id: string;
  examType: string;
  mode: string;
  status: string;
  score: number | null;
  duration: number;
  startedAt: string;
  finishedAt: string | null;
  passed: boolean | null;
}

interface ScoreTrendPoint {
  date: string;
  score: number;
  passed: boolean;
}

interface ExamTypeTrend {
  examType: ExamType;
  examTypeLabel: string;
  points: ScoreTrendPoint[];
  bestScore: number | null;
  latestScore: number | null;
  latestPassed: boolean | null;
  attemptCount: number;
  passedCount: number;
}

interface HistoryResponse {
  items: HistoryItem[];
  passScore: number;
  examTypeLabels: Record<string, string>;
  modeLabels: Record<string, string>;
}

interface TrendsResponse {
  rangeStart: string;
  rangeEnd: string;
  passScore: number;
  total: ExamTypeTrend[];
}

const EXAM_FILTER_OPTIONS = [
  { label: "全部科目", value: "" },
  { label: "综合知识", value: "comprehensive" },
  { label: "案例分析", value: "case" },
  { label: "论文", value: "essay" },
];

const RANGE_OPTIONS = [
  { label: "近 30 天", value: "30" },
  { label: "近 90 天", value: "90" },
  { label: "近 180 天", value: "180" },
  { label: "近 365 天", value: "365" },
];


const STATUS_TAG: Record<string, { label: string; color: string }> = {
  finished: { label: "已完成", color: "success" },
  in_progress: { label: "进行中", color: "processing" },
  paused: { label: "已暂停", color: "warning" },
  abandoned: { label: "已弃考", color: "default" },
};

function formatStartedAt(iso: string): string {
  // 服务端存的 ISO 串，截到分钟便于阅读
  return iso.length >= 16 ? iso.slice(0, 16).replace("T", " ") : iso;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}秒`;
  return `${m}分${s}秒`;
}

function scoreTagColor(score: number, passScore: number): string {
  if (score >= passScore) return "success";
  if (score >= passScore - 10) return "warning";
  return "error";
}

interface LineChartProps {
  series: { examType: ExamType; label: string; points: ScoreTrendPoint[] }[];
  passScore: number;
}

function TrendLineChart({ series, passScore }: LineChartProps) {
  const { token } = theme.useToken();
  const width = 720;
  const height = 240;
  const padding = { top: 24, right: 24, bottom: 36, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // 至少要有一个点
  const allPoints = series.flatMap((s) => s.points);
  const maxY = Math.max(75, passScore, ...allPoints.map((p) => p.score));

  // X 轴日期：取首尾 + 中间几个 tick
  const totalDays = series[0]?.points.length ?? 0;
  const xTick = (i: number) =>
    padding.left + (totalDays <= 1 ? innerWidth / 2 : (i / (totalDays - 1)) * innerWidth);
  const yScale = (score: number) =>
    padding.top + innerHeight - (score / maxY) * innerHeight;
  const passY = yScale(passScore);

  // Y 轴刻度：0/25/50/75
  const yTicks = [0, 25, 50, 75].filter((v) => v <= maxY + 5);

  // Legend 颜色（CSS var → 实际颜色）
  const legendColor: Record<ExamType, string> = {
    comprehensive: token.colorInfo,
    case: token.colorWarning,
    essay: token.colorSuccess,
  };

  function buildPath(points: ScoreTrendPoint[]): string {
    if (points.length === 0) return "";
    // 仅绘制有成绩(score > 0)的点；空白保持断开
    const segments: string[] = [];
    let current: string[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.score > 0) {
        const x = xTick(i);
        const y = yScale(p.score);
        current.push(current.length === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
      } else if (current.length > 0) {
        segments.push(current.join(" "));
        current = [];
      }
    }
    if (current.length > 0) segments.push(current.join(" "));
    return segments.join(" ");
  }

  return (
    <div>
      <Flex gap="middle" wrap="wrap" style={{ marginBottom: 8 }}>
        {series.map((s) => (
          <Space key={s.examType} size={4} align="center">
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 2,
                background: legendColor[s.examType],
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {s.label}
            </Text>
          </Space>
        ))}
        <Space size={4} align="center">
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 0,
              borderTop: `1px dashed ${token.colorError}`,
            }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            合格线 {passScore} 分
          </Text>
        </Space>
      </Flex>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="分数趋势折线图"
      >
        {/* Y 网格 */}
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={padding.left}
              x2={padding.left + innerWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke={token.colorBorderSecondary}
              strokeDasharray="2 4"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={yScale(tick) + 4}
              fill={token.colorTextTertiary}
              fontSize={10}
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        ))}
        {/* 合格线 */}
        <line
          x1={padding.left}
          x2={padding.left + innerWidth}
          y1={passY}
          y2={passY}
          stroke={token.colorError}
          strokeDasharray="6 4"
          strokeWidth={1}
        />
        {/* X 轴标签（首/中/尾三个日期） */}
        {series[0]?.points
          .filter((_, i, arr) => i === 0 || i === arr.length - 1 || i === Math.floor(arr.length / 2))
          .map((p, idx, arr) => {
            const i =
              idx === 0
                ? 0
                : idx === arr.length - 1
                  ? series[0].points.length - 1
                  : Math.floor(series[0].points.length / 2);
            return (
              <text
                key={`x-${p.date}-${i}`}
                x={xTick(i)}
                y={height - 12}
                fill={token.colorTextTertiary}
                fontSize={10}
                textAnchor="middle"
              >
                {p.date.slice(5)}
              </text>
            );
          })}
        {/* 折线 */}
        {series.map((s) => (
          <g key={s.examType}>
            <path
              d={buildPath(s.points)}
              fill="none"
              stroke={legendColor[s.examType]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.points.map((p, i) =>
              p.score > 0 ? (
                <circle
                  key={`${s.examType}-${i}`}
                  cx={xTick(i)}
                  cy={yScale(p.score)}
                  r={3}
                  fill={legendColor[s.examType]}
                />
              ) : null,
            )}
          </g>
        ))}
      </svg>
      {series.every((s) => s.points.every((p) => p.score === 0)) ? (
        <Empty
          description="区间内暂无完成的模考成绩"
          styles={{ image: { display: "none" } }}
          style={{ marginTop: -120 }}
        />
      ) : null}
    </div>
  );
}

export default function ExamHistoryPage() {
  const { token } = theme.useToken();
  const [examTypeFilter, setExamTypeFilter] = useState<string>("");
  const [days, setDays] = useState<string>("90");
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = examTypeFilter ? `?examType=${examTypeFilter}` : "";
    const tq = `?days=${days}${examTypeFilter ? `&examType=${examTypeFilter}` : ""}`;
    void Promise.all([
      apiRequest<HistoryResponse>(`/exam-history${q}`).catch(() => null),
      apiRequest<TrendsResponse>(`/exam-history/trends${tq}`).catch(() => null),
    ])
      .then(([h, t]) => {
        if (cancelled) return;
        setHistory(h);
        setTrends(t);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [examTypeFilter, days]);

  const passScore = history?.passScore ?? trends?.passScore ?? 45;
  const examLabels = history?.examTypeLabels ?? {};
  const modeLabels = history?.modeLabels ?? {};

  const filteredItems = useMemo(() => {
    if (!history?.items) return [];
    if (!examTypeFilter) return history.items;
    return history.items.filter((i) => i.examType === examTypeFilter);
  }, [history, examTypeFilter]);

  // 趋势折线数据：未选科目 → 取全部三科；选了科目 → 只一科
  const trendSeries = useMemo(() => {
    if (!trends?.total) return [];
    return trends.total.map((t) => ({
      examType: t.examType,
      label: t.examTypeLabel,
      points: t.points,
    }));
  }, [trends]);

  const columns: ColumnsType<HistoryItem> = [
    {
      title: "日期",
      dataIndex: "startedAt",
      key: "startedAt",
      width: 160,
      render: formatStartedAt,
    },
    {
      title: "科目",
      dataIndex: "examType",
      key: "examType",
      width: 100,
      render: (t: string) => examLabels[t] ?? t,
    },
    {
      title: "模式",
      dataIndex: "mode",
      key: "mode",
      width: 90,
      render: (m: string) => modeLabels[m] ?? m,
    },
    {
      title: "分数",
      dataIndex: "score",
      key: "score",
      width: 90,
      render: (score: number | null) =>
        score == null ? (
          <Text type="secondary">未交卷</Text>
        ) : (
          <Tag color={scoreTagColor(score, passScore)} style={{ minWidth: 48, textAlign: "center" }}>
            {score}
          </Tag>
        ),
    },
    {
      title: "用时",
      dataIndex: "duration",
      key: "duration",
      width: 90,
      render: (s: number) => formatDuration(s),
    },
    {
      title: "合格",
      dataIndex: "passed",
      key: "passed",
      width: 80,
      render: (passed: boolean | null, row) => {
        if (row.status !== "finished" || passed == null)
          return (
            <Tag color="default" style={{ minWidth: 48, textAlign: "center" }}>
              —
            </Tag>
          );
        return passed ? (
          <Tag color="success" icon={<TrophyOutlined />} style={{ minWidth: 48, textAlign: "center" }}>
            通过
          </Tag>
        ) : (
          <Tag color="error" style={{ minWidth: 48, textAlign: "center" }}>
            未达
          </Tag>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (s: string) => {
        const tag = STATUS_TAG[s];
        if (!tag) return <Tag>{s}</Tag>;
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
  ];

  return (
    <Flex vertical gap="middle" style={{ padding: token.padding, width: "100%" }}>
      <Title level={4} style={{ margin: 0 }}>
        成绩记录与趋势
      </Title>

      <Card size="small">
        <Space wrap>
          <Space>
            <Text type="secondary">科目</Text>
            <Select
              value={examTypeFilter}
              onChange={setExamTypeFilter}
              options={EXAM_FILTER_OPTIONS}
              style={{ width: 140 }}
            />
          </Space>
          <Space>
            <Text type="secondary">趋势区间</Text>
            <Segmented
              value={days}
              onChange={(v) => setDays(v)}
              options={RANGE_OPTIONS}
            />
          </Space>
          <Text type="secondary">
            {trends ? `${trends.rangeStart} ~ ${trends.rangeEnd}` : ""}
          </Text>
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Card title="分数趋势" size="small">
          {trendSeries.length === 0 ? (
            <Empty description="暂无趋势数据" />
          ) : (
            <TrendLineChart series={trendSeries} passScore={passScore} />
          )}
        </Card>

        <Card
          title="三科概况"
          size="small"
          styles={{ body: { paddingTop: 8 } }}
          style={{ marginTop: 16 }}
        >
          {trends?.total.length ? (
            <Flex gap="middle" wrap="wrap">
              {trends.total.map((t) => (
                <Card
                  key={t.examType}
                  size="small"
                  style={{ minWidth: 220, flex: "1 1 220px" }}
                  styles={{ body: { padding: 12 } }}
                >
                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    <Text strong>{t.examTypeLabel}</Text>
                    <Flex justify="space-between">
                      <Text type="secondary">最近一次</Text>
                      {t.latestScore == null ? (
                        <Text type="secondary">—</Text>
                      ) : (
                        <Tag
                          color={t.latestPassed ? "success" : "error"}
                          style={{ marginInlineEnd: 0 }}
                        >
                          {t.latestScore}
                        </Tag>
                      )}
                    </Flex>
                    <Flex justify="space-between">
                      <Text type="secondary">历史最高</Text>
                      <Text>{t.bestScore ?? "—"}</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text type="secondary">通过 / 总数</Text>
                      <Text>
                        {t.passedCount} / {t.attemptCount}
                      </Text>
                    </Flex>
                  </Space>
                </Card>
              ))}
            </Flex>
          ) : (
            <Empty description="暂无数据" />
          )}
        </Card>

        <Card title="历次记录" size="small" style={{ marginTop: 16 }}>
          <Table
            rowKey="id"
            dataSource={filteredItems}
            columns={columns}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: <Empty description="尚无模考记录" /> }}
          />
        </Card>
      </Spin>
    </Flex>
  );
}