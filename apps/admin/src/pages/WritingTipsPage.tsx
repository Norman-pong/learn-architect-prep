import { useEffect, useState } from "react";
import { Card, Collapse, List, Row, Col, Spin, Tag, Typography, Descriptions, Table } from "antd";
import { BookOutlined, BulbOutlined, BarChartOutlined, ProjectOutlined } from "@ant-design/icons";
import { apiRequest } from "../api/client";

const { Title, Paragraph, Text } = Typography;

interface Guideline {
  id: string;
  title: string;
  importance: "high" | "medium" | "low";
  content: string;
  template?: string;
  checklist?: string[];
  examples?: { bad: string; good: string }[];
  dimensions?: string[];
  required?: string[];
  optional?: string[];
  tips?: string[];
  suggested_points?: string[];
}

interface WritingTipsData {
  version: number;
  updatedAt: string;
  guidelines: Guideline[];
  word_count: Record<string, { min: number; max: number }>;
  hash: string;
}

interface Topic {
  year: number;
  session: string;
  title: string;
  theme: string;
  frequency: string;
}

interface HistoricalTopic {
  year: number;
  title: string;
}

interface HighFrequencyTheme {
  rank: number;
  theme: string;
  frequency: string;
}

interface YearTopicsData {
  version: number;
  updatedAt: string;
  periods: Record<string, string>;
  topics: Topic[];
  historical_before_2018: HistoricalTopic[];
  high_frequency_themes: HighFrequencyTheme[];
  strategy: {
    quick_judgment: string[];
    selection_principles: string[];
    preparation_plan: string;
  };
  hash: string;
}

interface TechDecision {
  id: string;
  name: string;
  description: string;
}

interface MasterProject {
  id: string;
  name: string;
  industry: string;
  scale: string;
  role: string;
  tech_decisions: TechDecision[];
  quantifiable_metrics: {
    before: Record<string, string | number>;
    after: Record<string, string | number>;
  };
  applicable_themes: string[];
}

interface MasterProjectsData {
  version: number;
  updatedAt: string;
  projects: MasterProject[];
  hash: string;
}

const importanceColor = {
  high: "red",
  medium: "blue",
  low: "default",
} as const;

const frequencyColor = {
  high: "red",
  medium: "blue",
  low: "default",
} as const;

export function WritingTipsPage() {
  const [tips, setTips] = useState<WritingTipsData | null>(null);
  const [topics, setTopics] = useState<YearTopicsData | null>(null);
  const [projects, setProjects] = useState<MasterProjectsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [tipsData, topicsData, projectsData] = await Promise.all([
          apiRequest<WritingTipsData>("/api/writing-tips/"),
          apiRequest<YearTopicsData>("/api/writing-tips/topics"),
          apiRequest<MasterProjectsData>("/api/writing-tips/projects"),
        ]);
        setTips(tipsData);
        setTopics(topicsData);
        setProjects(projectsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !tips || !topics || !projects) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Text type="danger">{error || "数据不完整"}</Typography.Text>
      </div>
    );
  }

  const guidelineItems = tips.guidelines.map((g) => ({
    key: g.id,
    label: (
      <span>
        <Tag color={importanceColor[g.importance]}>{g.importance}</Tag>
        <Text strong>{g.title}</Text>
      </span>
    ),
    children: (
      <div>
        <Paragraph>{g.content}</Paragraph>
        {g.template && (
          <Card size="small" title="模板" style={{ marginBottom: 12 }}>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                fontFamily: "inherit",
              }}
            >
              {g.template}
            </pre>
          </Card>
        )}
        {g.checklist && (
          <List
            size="small"
            header={<Text strong>检查清单</Text>}
            dataSource={g.checklist}
            renderItem={(item) => (
              <List.Item>
                <Text type="secondary">✓ {item}</Text>
              </List.Item>
            )}
          />
        )}
        {g.examples && (
          <List
            size="small"
            header={<Text strong>对比示例</Text>}
            dataSource={g.examples}
            renderItem={(item) => (
              <List.Item>
                <div>
                  <Text type="danger">× {item.bad}</Text>
                  <br />
                  <Text type="success">✓ {item.good}</Text>
                </div>
              </List.Item>
            )}
          />
        )}
        {g.dimensions && (
          <div style={{ marginTop: 8 }}>
            <Text strong>评估维度：</Text>
            {g.dimensions.map((d) => (
              <Tag key={d} style={{ margin: 2 }}>
                {d}
              </Tag>
            ))}
          </div>
        )}
        {g.required && (
          <div style={{ marginTop: 8 }}>
            <Text strong>必画：</Text>
            {g.required.map((d) => (
              <Tag color="red" key={d} style={{ margin: 2 }}>
                {d}
              </Tag>
            ))}
          </div>
        )}
        {g.optional && (
          <div style={{ marginTop: 8 }}>
            <Text strong>选画：</Text>
            {g.optional.map((d) => (
              <Tag key={d} style={{ margin: 2 }}>
                {d}
              </Tag>
            ))}
          </div>
        )}
        {g.tips && (
          <List
            size="small"
            header={<Text strong>画图提示</Text>}
            dataSource={g.tips}
            renderItem={(item) => <List.Item>• {item}</List.Item>}
          />
        )}
        {g.suggested_points && (
          <div style={{ marginTop: 8 }}>
            <Text strong>反思切入点：</Text>
            {g.suggested_points.map((d) => (
              <Tag key={d} style={{ margin: 2 }}>
                {d}
              </Tag>
            ))}
          </div>
        )}
      </div>
    ),
  }));

  const topicColumns = [
    {
      title: "年份",
      dataIndex: "year",
      key: "year",
      width: 80,
      sorter: (a: Topic, b: Topic) => a.year - b.year,
    },
    {
      title: "场次",
      dataIndex: "session",
      key: "session",
      width: 60,
    },
    {
      title: "题目",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "主题",
      dataIndex: "theme",
      key: "theme",
      render: (theme: string) => <Tag>{theme}</Tag>,
    },
    {
      title: "频率",
      dataIndex: "frequency",
      key: "frequency",
      render: (frequency: string) => {
        const color =
          frequency === "high" || frequency === "medium" || frequency === "low"
            ? frequencyColor[frequency]
            : "default";
        return <Tag color={color}>{frequency}</Tag>;
      },
    },
  ];

  const highFreqColumns = [
    {
      title: "排名",
      dataIndex: "rank",
      key: "rank",
      width: 60,
    },
    {
      title: "主题",
      dataIndex: "theme",
      key: "theme",
    },
    {
      title: "频率",
      dataIndex: "frequency",
      key: "frequency",
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <BookOutlined /> 写作技巧指导
      </Title>
      <Paragraph>
        系统架构设计师论文考试（4选1，120分钟，2000-3000字）的专项指导和历年题目分析。
      </Paragraph>

      <Collapse
        defaultActiveKey={["abstract"]}
        items={guidelineItems}
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <BarChartOutlined /> 字数分配建议
              </span>
            }
          >
            <Descriptions bordered size="small" column={1}>
              {Object.entries(tips.word_count)
                .filter(([key]) => key !== "total")
                .map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {value.min} - {value.max} 字
                  </Descriptions.Item>
                ))}
              <Descriptions.Item label="total">
                {tips.word_count.total.min} - {tips.word_count.total.max} 字
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <BulbOutlined /> 选题策略
              </span>
            }
          >
            <Paragraph strong>四选一快速判断</Paragraph>
            <List
              size="small"
              dataSource={topics.strategy.quick_judgment}
              renderItem={(item) => <List.Item>• {item}</List.Item>}
            />
            <Paragraph strong style={{ marginTop: 12 }}>
              选择原则
            </Paragraph>
            <List
              size="small"
              dataSource={topics.strategy.selection_principles}
              renderItem={(item) => <List.Item>• {item}</List.Item>}
            />
            <Paragraph style={{ marginTop: 12 }}>{topics.strategy.preparation_plan}</Paragraph>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span>
            <BarChartOutlined /> 历年论文题目汇总（2018-2025）
          </span>
        }
        style={{ marginTop: 24 }}
      >
        <Paragraph>阶段趋势</Paragraph>
        <List
          size="small"
          dataSource={Object.entries(topics.periods)}
          renderItem={([period, desc]) => (
            <List.Item>
              <Tag>{period}</Tag> {desc}
            </List.Item>
          )}
        />
        <Table
          dataSource={topics.topics}
          columns={topicColumns}
          rowKey={(record) => `${record.year}-${record.session}`}
          pagination={false}
          size="small"
          style={{ marginTop: 16 }}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="2018年之前历年题目">
            <List
              size="small"
              dataSource={topics.historical_before_2018}
              renderItem={(item) => (
                <List.Item>
                  <Tag>{item.year}</Tag> {item.title}
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="高频主题（备考重点）">
            <Table
              dataSource={topics.high_frequency_themes}
              columns={highFreqColumns}
              rowKey="rank"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span>
            <ProjectOutlined /> 母版项目素材
          </span>
        }
        style={{ marginTop: 24 }}
      >
        <Paragraph>
          建议准备2-3个母版项目，每个项目覆盖5-8个技术决策点。以下三个母版覆盖电商、中台/数据平台、政务/企业系统三大方向。
        </Paragraph>
        {projects.projects.map((project) => (
          <Card key={project.id} type="inner" title={project.name} style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="行业">{project.industry}</Descriptions.Item>
              <Descriptions.Item label="规模">{project.scale}</Descriptions.Item>
              <Descriptions.Item label="角色">{project.role}</Descriptions.Item>
            </Descriptions>
            <Paragraph strong style={{ marginTop: 12 }}>
              技术决策点
            </Paragraph>
            <List
              size="small"
              dataSource={project.tech_decisions}
              renderItem={(decision) => (
                <List.Item>
                  <Text strong>{decision.name}</Text>：{decision.description}
                </List.Item>
              )}
            />
            <Paragraph strong style={{ marginTop: 12 }}>
              量化指标
            </Paragraph>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="优化前">
                  {Object.entries(project.quantifiable_metrics.before).map(([key, value]) => (
                    <div key={key}>
                      <Tag>{key}</Tag> {String(value)}
                    </div>
                  ))}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="优化后">
                  {Object.entries(project.quantifiable_metrics.after).map(([key, value]) => (
                    <div key={key}>
                      <Tag color="green">{key}</Tag> {String(value)}
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>
            <Paragraph strong style={{ marginTop: 12 }}>
              适用主题
            </Paragraph>
            {project.applicable_themes.map((theme) => (
              <Tag key={theme} style={{ margin: 2 }}>
                {theme}
              </Tag>
            ))}
          </Card>
        ))}
      </Card>
    </div>
  );
}
