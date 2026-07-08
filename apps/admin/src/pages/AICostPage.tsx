import { Card, Table, Tag, Typography, Space, Statistic, Row, Col, Select } from "antd";
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

const { Title, Text } = Typography;
const { Option } = Select;

interface FeatureUsage {
  feature: string;
  provider: string;
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
}

interface SummaryPeriod {
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
}

interface CostSummary {
  today: SummaryPeriod;
  thisWeek: SummaryPeriod;
  total: SummaryPeriod;
}

const FEATURE_LABEL: Record<string, string> = {
  选题: "AI 智能选题",
  评分: "AI 论文/案例评分",
  答疑: "AI 知识点答疑",
};

function featureLabel(feature: string) {
  return FEATURE_LABEL[feature] ?? feature;
}

function providerColor(provider: string) {
  switch (provider) {
    case "openai":
      return "green";
    case "anthropic":
      return "purple";
    case "deepseek":
      return "blue";
    case "minimax":
      return "cyan";
    case "kimi":
      return "orange";
    default:
      return "default";
  }
}

export function AICostPage() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [stats, setStats] = useState<FeatureUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      apiRequest<CostSummary>("/api/ai-cost/summary"),
      apiRequest<FeatureUsage[]>("/api/ai-cost/by-feature"),
    ])
      .then(([sum, byFeature]) => {
        setSummary(sum);
        setStats(byFeature);
      })
      .finally(() => setLoading(false));
  }, []);

  const providers = Array.from(new Set(stats.map((s) => s.provider)));
  const filtered =
    providerFilter === "all" ? stats : stats.filter((s) => s.provider === providerFilter);

  const totalRow = {
    key: "total",
    feature: "合计",
    provider: "-",
    model: "-",
    calls: filtered.reduce((sum, s) => sum + s.calls, 0),
    inputTokens: filtered.reduce((sum, s) => sum + s.inputTokens, 0),
    outputTokens: filtered.reduce((sum, s) => sum + s.outputTokens, 0),
    costEstimate: filtered.reduce((sum, s) => sum + s.costEstimate, 0),
  };

  const columns = [
    {
      title: "功能",
      dataIndex: "feature",
      key: "feature",
      render: (v: string) => featureLabel(v),
    },
    {
      title: "Provider",
      dataIndex: "provider",
      key: "provider",
      render: (v: string) =>
        v === "-" ? <Text type="secondary">-</Text> : <Tag color={providerColor(v)}>{v}</Tag>,
    },
    { title: "模型", dataIndex: "model", key: "model" },
    { title: "调用次数", dataIndex: "calls", key: "calls" },
    {
      title: "输入 tokens",
      dataIndex: "inputTokens",
      key: "inputTokens",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "输出 tokens",
      dataIndex: "outputTokens",
      key: "outputTokens",
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "估算费用 (USD)",
      dataIndex: "costEstimate",
      key: "costEstimate",
      render: (v: number) => `$${v.toFixed(6)}`,
    },
  ];

  const tableData = [
    ...filtered.map((s, idx) => ({ key: idx, ...s })),
    ...(filtered.length > 0 ? [totalRow] : []),
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>AI 成本展示</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="今日 token 消耗"
              value={summary?.today.inputTokens ?? 0}
              suffix={<Text type="secondary">/ {summary?.today.outputTokens ?? 0} 输出</Text>}
            />
            <Text type="secondary">
              ${summary?.today.costEstimate.toFixed(6) ?? "0.000000"} USD
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="本周 token 消耗"
              value={summary?.thisWeek.inputTokens ?? 0}
              suffix={<Text type="secondary">/ {summary?.thisWeek.outputTokens ?? 0} 输出</Text>}
            />
            <Text type="secondary">
              ${summary?.thisWeek.costEstimate.toFixed(6) ?? "0.000000"} USD
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="累计 token 消耗"
              value={summary?.total.inputTokens ?? 0}
              suffix={<Text type="secondary">/ {summary?.total.outputTokens ?? 0} 输出</Text>}
            />
            <Text type="secondary">
              ${summary?.total.costEstimate.toFixed(6) ?? "0.000000"} USD
            </Text>
          </Card>
        </Col>
      </Row>

      <Card
        loading={loading}
        title={
          <Space>
            <span>按功能分类</span>
            <Select
              value={providerFilter}
              onChange={(v) => setProviderFilter(v)}
              style={{ width: 160 }}
              allowClear
              placeholder="全部 provider"
            >
              <Option value="all">全部 provider</Option>
              {providers.map((p) => (
                <Option key={p} value={p}>
                  {p}
                </Option>
              ))}
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          summary={() =>
            filtered.length === 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={8}>
                  <Text type="secondary">暂无 AI 调用记录</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          }
        />
      </Card>
    </div>
  );
}
