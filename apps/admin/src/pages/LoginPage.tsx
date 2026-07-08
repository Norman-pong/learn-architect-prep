import { Card, Typography, Button, Form, Input } from "antd";
import { useNavigate } from "react-router";

const { Title, Paragraph } = Typography;

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <Card>
        <Title level={3} style={{ textAlign: "center" }}>
          ArchPrep 登录
        </Title>
        <Paragraph style={{ textAlign: "center" }}>邮件验证码登录占位页</Paragraph>
        <Form layout="vertical">
          <Form.Item label="邮箱">
            <Input placeholder="your@email.com" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" block onClick={() => navigate("/")}>
              登录占位
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
