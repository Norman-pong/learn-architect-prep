import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, List, Progress, Space, Tag, Typography, Empty, Button, Spin, Flex } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { apiRequest, getAccessToken } from "../api/client";

const { Title, Text } = Typography;

interface WeakPoint {
  chapterId: string;
  chapterName: string;
  section: string;
  correctRate: number;
  totalQuestions: number;
  correctCount: number;
  isWeak: boolean;
}

export default function WeaknessPage() {
  const navigate = useNavigate();
  const [points, setPoints] = useState<WeakPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiRequest<WeakPoint[]>("/api/weakness")
      .then((data) => setPoints(data))
      .catch(() => setPoints([]))
      .finally(() => setLoading(false));
  }, []);

  const weakOnly = points.filter((p) => p.isWeak);

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        薄弱点识别
      </Title>
      {loading ? (
        <Spin size="large" />
      ) : weakOnly.length === 0 ? (
        <Empty description="暂无薄弱知识点，继续保持！" />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 1 }}
          dataSource={weakOnly}
          renderItem={(item) => (
            <List.Item>
              <Card
                title={
                  <Space>
                    <Text strong>{item.chapterName}</Text>
                    <Tag color="error">薄弱</Tag>
                    {item.section && <Tag>{item.section}</Tag>}
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    size="small"
                    onClick={() =>
                      navigate(`/quiz?chapter=${item.chapterId}&mode=chapter&smart=true`)
                    }
                  >
                    智能选题
                  </Button>
                }
              >
                <Flex vertical style={{ width: "100%" }}>
                  <Flex style={{ justifyContent: "space-between", width: "100%" }}>
                    <Text>正确率</Text>
                    <Text type="danger" strong>
                      {item.correctRate}%
                    </Text>
                  </Flex>
                  <Progress percent={item.correctRate} status="exception" showInfo={false} />
                  <Text type="secondary">
                    共{item.totalQuestions}题，答对{item.correctCount}题
                  </Text>
                </Flex>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
