import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, Col, Row, Statistic, Typography, theme } from "antd";
import { apiRequest } from "../api/client";

const { Title, Text } = Typography;

interface DashboardData {
  todayReviewCount: number;
  streakDays: number;
  weakPointCount: number;
  lastMockScore: number | null;
}

const MOCK_DASHBOARD: DashboardData = {
  todayReviewCount: 12,
  streakDays: 7,
  weakPointCount: 3,
  lastMockScore: 82,
};

export function HomePage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

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
          <Card title="复习推荐" bordered>
            <Text type="secondary">复习推荐列表占位区（待接入）</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
