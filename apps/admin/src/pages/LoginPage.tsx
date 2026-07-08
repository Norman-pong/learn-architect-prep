import { Card, Typography, Button, Form, Input, Space, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { setTokens, sendCode, verifyCode } from "../api/client";

const { Title, Paragraph } = Typography;

const COUNTDOWN_SECONDS = 60;

export function LoginPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [countdown, setCountdown] = useState(0);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    const value = form.getFieldValue("email");
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
      message.error("请输入有效邮箱");
      return;
    }

    setLoadingSend(true);
    try {
      await sendCode(value);
      setCountdown(COUNTDOWN_SECONDS);
      message.success("验证码已发送");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "发送失败");
    } finally {
      setLoadingSend(false);
    }
  };

  const handleLogin = async (values: { email: string; code: string }) => {
    setLoadingLogin(true);
    try {
      const { accessToken, refreshToken } = await verifyCode(values.email, values.code);
      setTokens(accessToken, refreshToken);
      message.success("登录成功");
      void navigate("/");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <Card>
        <Title level={3} style={{ textAlign: "center" }}>
          ArchPrep 登录
        </Title>
        <Paragraph style={{ textAlign: "center" }}>邮件验证码登录</Paragraph>
        <Form layout="vertical" form={form} onFinish={handleLogin}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效邮箱" },
            ]}
          >
            <Input placeholder="your@email.com" />
          </Form.Item>
          <Form.Item
            label="验证码"
            name="code"
            rules={[
              { required: true, message: "请输入验证码" },
              { pattern: /^\d{6}$/, message: "验证码为 6 位数字" },
            ]}
          >
            <Space.Compact style={{ width: "100%" }}>
              <Input placeholder="123456" maxLength={6} />
              <Button loading={loadingSend} disabled={countdown > 0} onClick={() => void handleSendCode()}>
                {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loadingLogin}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
