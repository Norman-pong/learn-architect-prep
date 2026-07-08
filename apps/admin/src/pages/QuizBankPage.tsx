import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from "antd";
import { CloudDownloadOutlined } from "@ant-design/icons";

import { apiRequest } from "../../api/client";

const { Option } = Select;

interface ChoiceQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation?: string;
  chapter?: string;
  difficulty?: "easy" | "medium" | "hard";
  source?: string;
  hash?: string;
  year?: number | null;
}

interface Stats {
  total: number;
  byChapter: { chapter: string; count: number }[];
  bySource: { source: string; count: number }[];
}

interface ImportResult {
  ok: boolean;
  added: number;
  skipped: number;
  failed: number;
  errors?: { reason: string }[];
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "易",
  medium: "中",
  hard: "难",
};

const DIFFICULTY_COLORS: Record<string, "green" | "orange" | "red"> = {
  easy: "green",
  medium: "orange",
  hard: "red",
};

export function QuizBankPage() {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [questions, setQuestions] = useState<ChoiceQuestion[]>([]);
  const [importUrl, setImportUrl] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [filters, setFilters] = useState({
    chapter: undefined as string | undefined,
    difficulty: undefined as string | undefined,
    source: undefined as string | undefined,
    year: undefined as string | undefined,
  });
  const [sources, setSources] = useState<{ source: string; count: number }[]>([]);

  const loadStats = async () => {
    try {
      const s = await apiRequest<Stats>("/api/quiz-bank/stats");
      setStats(s);
      const src = await apiRequest<{ sources: { source: string; count: number }[] }>(
        "/api/quiz-bank/sources",
      );
      setSources(src.sources);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载统计失败");
    }
  };

  const loadQuestions = async (query: Record<string, string | undefined>) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v) params.set(k, v);
      }
      const qs = await apiRequest<ChoiceQuestion[]>(
        `/api/quiz-bank/questions?${params.toString()}`,
      );
      setQuestions(qs);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载题目失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
    void loadQuestions(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (key: keyof typeof filters, value: string | undefined) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    void loadQuestions(next);
  };

  const handleImport = async () => {
    if (!importUrl.trim()) {
      message.warning("请输入远程题库 URL");
      return;
    }
    setImporting(true);
    try {
      const result = await apiRequest<ImportResult>("/api/quiz-bank/import", {
        method: "POST",
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      setImportResult(result);
      if (result.ok) {
        message.success(`导入成功：新增 ${result.added} 题，跳过 ${result.skipped} 题`);
      } else {
        message.error("导入失败，请查看错误信息");
      }
      await loadStats();
      await loadQuestions(filters);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 120,
    },
    {
      title: "题目",
      dataIndex: "question",
      key: "question",
      render: (text: string) => <div style={{ maxWidth: 400 }}>{text}</div>,
    },
    {
      title: "章节",
      dataIndex: "chapter",
      key: "chapter",
      width: 100,
    },
    {
      title: "难度",
      dataIndex: "difficulty",
      key: "difficulty",
      width: 80,
      render: (d: string) =>
        d ? <Tag color={DIFFICULTY_COLORS[d] || "default"}>{DIFFICULTY_LABELS[d] || d}</Tag> : "-",
    },
    {
      title: "来源",
      dataIndex: "source",
      key: "source",
      width: 140,
    },
    {
      title: "年份",
      dataIndex: "year",
      key: "year",
      width: 80,
      render: (y: number | null) => (y ? String(y) : "-"),
    },
    {
      title: "答案",
      dataIndex: "answer",
      key: "answer",
      width: 60,
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="总题数" value={stats?.total ?? 0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="覆盖章节" value={stats?.byChapter.length ?? 0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="来源数" value={stats?.bySource.length ?? 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="按章节分布">
            {stats?.byChapter.map(({ chapter, count }) => (
              <Tag key={chapter} style={{ margin: 4 }}>
                {chapter}: {count}
              </Tag>
            ))}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="按来源分布">
            {sources.map(({ source, count }) => (
              <Tag key={source} style={{ margin: 4 }}>
                {source}: {count}
              </Tag>
            ))}
          </Card>
        </Col>
      </Row>

      <Card title="远程题库导入">
        <Form layout="inline">
          <Form.Item label="远程 URL" style={{ flex: 1 }}>
            <Input
              placeholder="https://example.com/questions.json"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              loading={importing}
              onClick={handleImport}
              disabled={!importUrl.trim()}
            >
              导入
            </Button>
          </Form.Item>
        </Form>
        {importResult && (
          <Space direction="vertical" style={{ marginTop: 16 }}>
            <div>
              结果：
              {importResult.ok ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>}
            </div>
            <div>
              新增 <Tag color="green">{importResult.added}</Tag> / 跳过{" "}
              <Tag>{importResult.skipped}</Tag> / 失败 <Tag color="red">{importResult.failed}</Tag>
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ color: "#cf1322" }}>
                错误：{importResult.errors[0].reason}
                {importResult.errors.length > 1 && ` 等 ${importResult.errors.length} 项`}
              </div>
            )}
          </Space>
        )}
      </Card>

      <Card title="题目列表">
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            placeholder="章节"
            style={{ width: 120 }}
            value={filters.chapter}
            onChange={(v) => handleFilterChange("chapter", v)}
          >
            {Array.from({ length: 20 }, (_, i) => String(i + 1)).map((c) => (
              <Option key={c} value={c}>
                第 {c} 章
              </Option>
            ))}
          </Select>
          <Select
            allowClear
            placeholder="难度"
            style={{ width: 100 }}
            value={filters.difficulty}
            onChange={(v) => handleFilterChange("difficulty", v)}
          >
            <Option value="easy">易</Option>
            <Option value="medium">中</Option>
            <Option value="hard">难</Option>
          </Select>
          <Select
            allowClear
            placeholder="来源"
            style={{ width: 160 }}
            value={filters.source}
            onChange={(v) => handleFilterChange("source", v)}
          >
            {sources.map((s) => (
              <Option key={s.source} value={s.source}>
                {s.source} ({s.count})
              </Option>
            ))}
          </Select>
          <Input
            placeholder="年份"
            style={{ width: 100 }}
            value={filters.year}
            onChange={(e) => handleFilterChange("year", e.target.value || undefined)}
          />
        </Space>
        <Table
          rowKey="id"
          dataSource={questions}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 20 }}
          expandable={{
            expandedRowRender: (record: ChoiceQuestion) => (
              <Space direction="vertical">
                <div>选项：</div>
                {Object.entries(record.options).map(([k, v]) => (
                  <div key={k}>
                    {k}. {v}
                  </div>
                ))}
                {record.explanation && <div>解析：{record.explanation}</div>}
                {record.hash && (
                  <div style={{ color: "#888" }}>hash: {record.hash.slice(0, 16)}…</div>
                )}
              </Space>
            ),
          }}
        />
      </Card>
    </Space>
  );
}

export default QuizBankPage;
