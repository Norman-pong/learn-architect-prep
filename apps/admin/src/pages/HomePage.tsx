import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function HomePage() {
  return (
    <Card>
      <Title level={3}>欢迎来到 ArchPrep</Title>
      <Paragraph>系统架构设计师备考系统首页占位。</Paragraph>
    </Card>
  );
}
