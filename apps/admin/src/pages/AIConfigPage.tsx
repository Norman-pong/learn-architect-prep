import { useEffect, useState } from "react";
import { Button, Card, Form, Input, message, Select, Space, Spin } from "antd";
import type { Provider } from "@archprep/shared";

const { Option } = Select;

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "minimax", label: "MiniMax" },
  { value: "kimi", label: "Kimi" },
  { value: "custom", label: "自定义" },
];

interface AIConfigForm {
  provider: Provider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface AIConfigResponse {
  id: string;
  userId: string;
  provider: Provider;
  model?: string;
  baseUrl?: string;
  updatedAt: string;
}

async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "请求失败" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function AIConfigPage() {
  const [form] = Form.useForm<AIConfigForm>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [provider, setProvider] = useState<Provider>("openai");

  useEffect(() => {
    setLoading(true);
    fetchWithAuth<AIConfigResponse | null>("/api/ai-config")
      .then((config) => {
        if (config) {
          form.setFieldsValue({
            provider: config.provider,
            model: config.model,
            baseUrl: config.baseUrl,
          });
          setProvider(config.provider);
          setHasKey(true);
        }
      })
      .catch((err: Error) => {
        message.error(err.message);
      })
      .finally(() => setLoading(false));
  }, [form]);

  const handleSave = async (values: AIConfigForm) => {
    setSaving(true);
    try {
      await fetchWithAuth<AIConfigResponse>("/api/ai-config", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      setHasKey(true);
      message.success("保存成功");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await fetchWithAuth<{ success: boolean; message: string }>(
        "/api/ai-config/test",
        { method: "POST" }
      );
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "测试失败");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card title="AI 配置" loading={loading}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ provider: "openai" }}
        onFinish={handleSave}
        onValuesChange={(_, all) => setProvider(all.provider)}
      >
        <Form.Item
          name="provider"
          label="Provider"
          rules={[{ required: true, message: "请选择 provider" }]}
        >
          <Select>
            {PROVIDERS.map((p) => (
              <Option key={p.value} value={p.value}>
                {p.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="apiKey"
          label="API Key"
          rules={[{ required: !hasKey, message: "请输入 API Key" }]}
        >
          <Input.Password
            placeholder={hasKey ? "已配置（输入以覆盖）" : "输入 API Key"}
          />
        </Form.Item>

        <Form.Item name="model" label="模型">
          <Input placeholder="例如 gpt-4o-mini" />
        </Form.Item>

        {provider === "custom" && (
          <Form.Item
            name="baseUrl"
            label="Base URL"
            rules={[{ required: true, message: "请输入 base URL" }]}
          >
            <Input placeholder="https://api.example.com/v1" />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存
            </Button>
            <Button onClick={handleTest} loading={testing}>
              测试连接
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
