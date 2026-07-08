import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Empty, Input, List, Space, Spin, Tag, Typography } from "antd";

import { BookOutlined, EyeOutlined, FilterOutlined, SearchOutlined } from "@ant-design/icons";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

const { Title, Paragraph, Text } = Typography;

/** Comment block annotation prefixes that map to human labels */
const ANNOTATION_LABELS: Record<string, { label: string; color: string }> = {
  decision: { label: "技术决策点", color: "blue" },
  compare: { label: "对比分析", color: "green" },
  reflection: { label: "反思", color: "orange" },
};

interface SampleMeta {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  word_count: number;
  year: string;
  tags: string[];
  file: string;
}

/** Parse HTML‑style comment blocks out of raw markdown */
function parseAnnotations(raw: string): { type: keyof typeof ANNOTATION_LABELS; text: string }[] {
  const anns: { type: keyof typeof ANNOTATION_LABELS; text: string }[] = [];
  const re = /<!--\s*(decision|compare|reflection)\s*:\s*([\s\S]*?)-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const type = m[1];
    if (type === "decision" || type === "compare" || type === "reflection") {
      anns.push({ type, text: m[2].trim() });
    }
  }
  return anns;
}

/** Strip comment blocks for a clean preview */
function stripComments(raw: string): string {
  return raw.replace(/<!--[\s\S]*?-->/g, "");
}

export function SamplesPage() {
  const [samples, setSamples] = useState<SampleMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mdContent, setMdContent] = useState<string | null>(null);
  const [loadingMd, setLoadingMd] = useState(false);

  // Fetch index
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/samples/`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: SampleMeta[]) => setSamples(data))
      .catch(() => setSamples([]))
      .finally(() => setLoading(false));
  }, []);

  const topics = useMemo(() => [...new Set(samples.map((s) => s.topic))].toSorted(), [samples]);

  const filtered = useMemo(() => {
    let list = samples;
    if (topicFilter) {
      list = list.filter((s) => s.topic === topicFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) => s.title.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [topicFilter, search, samples]);

  const handleView = useCallback(
    async (id: string) => {
      setActiveId(id);
      setLoadingMd(true);
      setMdContent(null);
      try {
        const s = samples.find((x) => x.id === id);
        if (!s) return;
        const slug = s.file.replace(/\.md$/, "");
        const res = await fetch(`${API_BASE_URL}/api/samples/${slug}`);
        if (!res.ok) {
          setMdContent("范文加载失败，请稍后重试。");
          return;
        }
        const raw = await res.text();
        setMdContent(raw);
      } catch {
        setMdContent("范文加载失败，请稍后重试。");
      } finally {
        setLoadingMd(false);
      }
    },
    [samples],
  );

  const activeSample = samples.find((s) => s.id === activeId);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Header */}
      <Card>
        <Title level={3}>
          <BookOutlined /> 范文库
        </Title>
        <Paragraph type="secondary">
          覆盖系统架构设计师考试 10
          大高频主题范文，每篇标注技术决策点、数字量化、对比分析与反思。点击查看全文与点评。
        </Paragraph>
        <Space wrap>
          <Button
            size="small"
            type={topicFilter === null ? "primary" : "default"}
            onClick={() => setTopicFilter(null)}
          >
            全部主题
          </Button>
          {topics.map((t) => (
            <Button
              key={t}
              size="small"
              type={topicFilter === t ? "primary" : "default"}
              icon={<FilterOutlined />}
              onClick={() => setTopicFilter(t)}
            >
              {t}
            </Button>
          ))}
        </Space>
        <div style={{ marginTop: 12 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索范文标题或标签…"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Space direction="horizontal" align="start" style={{ width: "100%" }} size="middle">
        {/* List panel */}
        <Card
          title={loading ? "范文列表（加载中…）" : `范文列表（${filtered.length} 篇）`}
          style={{
            width: 420,
            minWidth: 320,
            flexShrink: 0,
            maxHeight: "75vh",
            overflow: "auto",
          }}
        >
          {loading ? (
            <Spin />
          ) : filtered.length === 0 ? (
            <Empty description="没有匹配的范文" />
          ) : (
            <List
              dataSource={filtered}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleView(item.id)}
                    >
                      查看
                    </Button>,
                  ]}
                  style={{
                    background: activeId === item.id ? "#f0f5ff" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => handleView(item.id)}
                >
                  <List.Item.Meta
                    title={
                      <Text strong={activeId === item.id}>
                        {item.title.length > 30 ? item.title.slice(0, 30) + "…" : item.title}
                      </Text>
                    }
                    description={
                      <Space wrap size={[4, 2]}>
                        <Tag color="blue">{item.topic}</Tag>
                        <Tag>{item.difficulty} 星</Tag>
                        <Tag>{item.word_count} 字</Tag>
                        <Tag>{item.year}</Tag>
                        {item.tags.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Detail panel */}
        <Card
          title={activeSample ? activeSample.title : "范文详情"}
          loading={loadingMd}
          style={{ flex: 1, minHeight: "60vh", overflow: "auto" }}
        >
          {mdContent ? (
            <div style={{ maxWidth: 720 }}>
              {/* Annotations */}
              {parseAnnotations(mdContent).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {parseAnnotations(mdContent).map((ann, i) => {
                    const meta = ANNOTATION_LABELS[ann.type];
                    return (
                      <Card
                        key={i}
                        size="small"
                        style={{
                          marginBottom: 8,
                          borderLeft: `4px solid var(--ant-color-${meta.color})`,
                        }}
                      >
                        <Text
                          strong
                          style={{
                            color: `var(--ant-color-${meta.color})`,
                          }}
                        >
                          [{meta.label}]
                        </Text>
                        <Paragraph
                          style={{
                            margin: "4px 0 0 0",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {ann.text}
                        </Paragraph>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Clean markdown body */}
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--ant-font-family)",
                  lineHeight: 1.8,
                  fontSize: 14,
                }}
              >
                {stripComments(mdContent)}
              </div>
            </div>
          ) : (
            <Paragraph type="secondary">从左侧列表选择一篇范文，查看全文及标注点评。</Paragraph>
          )}
        </Card>
      </Space>
    </Space>
  );
}
