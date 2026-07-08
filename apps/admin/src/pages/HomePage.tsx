import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, Col, Row, Statistic, Typography, theme, List, Tag } from "antd";
import { apiRequest } from "../api/client";

const { Title, Text } = Typography;

interface DashboardData {
  todayReviewCount: number;
  streakDays: number;
  weakPointCount: number;
  lastMockScore: number | null;
}

interface RecommendItem {
  knowledgePointId: string;
  title: string;
  chapterId: string;
  correctRate: number;
  examWeight: number;
  score: number;
}

const MOCK_DASHBOARD: DashboardData = {
  todayReviewCount: 12,
  streakDays: 7,
  weakPointCount: 3,
  lastMockScore: 82,
};

const MOCK_RECOMMENDATIONS: RecommendItem[] = [
  {
    knowledgePointId: "ch07",
    title: "系统架构设计基础知识",
    chapterId: "ch07",
    correctRate: 52,
    examWeight: 5,
    score: 240,
  },
  {
    knowledgePointId: "ch14",
    title: "云原生架构设计理论与实践",
    chapterId: "ch14",
    correctRate: 48,
    examWeight: 5,
    score: 260,
  },
  {
    knowledgePointId: "ch18",
    title: "安全架构设计理论与实践",
    chapterId: "ch18",
    correctRate: 55,
    examWeight: 5,
    score: 225,
  },
];

export function HomePage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const [recommendations, setRecommendations] = useState<RecommendItem[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // TODO: switch to live /api/dashboard once backend endpoint is ready
    apiRequest<DashboardData>("/api/dashboard")
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(MOCK_DASHBOARD);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    setRecLoading(true);
    apiRequest<RecommendItem[]>("/api/recommend")
      .then((res) => {
        if (!cancelled) setRecommendations(res);
      })
      .catch(() => {
        if (!cancelled) setRecommendations(MOCK_RECOMMENDATIONS);
      })
      .finally(() => {
        if (!cancelled) setRecLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboard = data ?? MOCK_DASHBOARD;

  return (
    <div style={{ padding: token.padding }}>
      <Title level={3} style={{ marginBottom: token.marginLG }}>
        学习仪表盘
      </Title>

      <Row gutter={[token.padding, token.padding]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} bordered>
            <Statistic
              title="今日复习"
              value={dashboard.todayReviewCount}
              valueStyle={{ fontSize: token.fontSizeHeading2 }}
            />
            <Button
              type="primary"
              size="small"
              style={{ marginTop: token.marginSM }}
              onClick={() => navigate("/review")}
            >
              去复习
            </Button>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} bordered>
            <Statistic
              title="连续学习天数"
              value={dashboard.streakDays}
              suffix="天"
              valueStyle={{ fontSize: token.fontSizeHeading2 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} bordered>
            <Statistic
              title="薄弱点预警"
              value={dashboard.weakPointCount}
              valueStyle={{
                color: token.colorError,
                fontSize: token.fontSizeHeading2,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading} bordered>
            <Statistic
              title="上次模考成绩"
              value={dashboard.lastMockScore ?? "--"}
              suffix={dashboard.lastMockScore != null ? "分" : ""}
              valueStyle={{ fontSize: token.fontSizeHeading2 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[token.padding, token.padding]} style={{ marginTop: token.marginLG }}>
        <Col xs={24} lg={12}>
          <Card title="成绩趋势" bordered>
            <Text type="secondary">成绩趋势图占位区（待接入）</Text>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="复习推荐" bordered loading={recLoading}>
            {recommendations.length === 0 ? (
              <Text type="secondary">暂无薄弱知识点，继续保持！</Text>
            ) : (
              <List
                size="small"
                dataSource={recommendations}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        size="small"
                        onClick={() => navigate(`/knowledge/${item.chapterId}`)}
                      >
                        去复习
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <span>
                          {item.title}
                          <Tag color="warning" style={{ marginLeft: 8 }}>
                            权重 {item.examWeight}
                          </Tag>
                        </span>
                      }
                      description={
                        <Text type="secondary">
                          正确率 {item.correctRate}% · 推荐分 {item.score}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
