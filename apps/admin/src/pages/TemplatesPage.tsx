import { useEffect, useState } from "react";
import { Card, Col, Collapse, Row, Spin, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import { apiRequest } from "../api/client";

const { Title, Paragraph } = Typography;

interface TemplateSection {
  id: string;
  name: string;
  word_count: { min: number; max: number };
  weight: string;
}

interface TemplateMeta {
  id: string;
  title: string;
  description: string;
  file: string;
  sections: string[];
  word_count: { min: number; max: number };
}

interface TemplateDetail {
  title: string;
  sections: TemplateSection[];
  word_count: { total: { min: number; max: number } };
  content: string;
}

interface TemplateData {
  templates: TemplateMeta[];
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [details, setDetails] = useState<Record<string, TemplateDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<TemplateData>("/api/templates")
      .then((data) => {
        setTemplates(data.templates);
        return Promise.all(
          data.templates.map((t) =>
            apiRequest<string>(`/api/templates/${t.id}`, {
              headers: { Accept: "text/markdown" },
            }).then((text) => ({ id: t.id, text })),
          ),
        );
      })
      .then((results) => {
        const map: Record<string, TemplateDetail> = {};
        for (const { id, text } of results) {
          map[id] = parseTemplateMarkdown(text);
        }
        setDetails(map);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <Title level={4}>加载失败</Title>
        <Paragraph type="danger">{error}</Paragraph>
      </Card>
    );
  }

  return (
    <div>
      <Title level={3}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        论文模板库
      </Title>
      <Paragraph>选择适合论文主题的模板，点击卡片展开查看结构与填写引导。</Paragraph>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {templates.map((t) => (
          <Col xs={24} md={12} lg={8} key={t.id}>
            <Card title={t.title} bordered>
              <Paragraph>{t.description}</Paragraph>
              <Paragraph type="secondary">
                {t.sections.length} 节 · 建议字数 {t.word_count.min}–{t.word_count.max} 字
              </Paragraph>
              <Collapse
                ghost
                items={[
                  {
                    key: t.id,
                    label: "预览模板内容",
                    children: details[t.id] ? (
                      <div>
                        <Paragraph strong>{details[t.id].title}</Paragraph>
                        <ul>
                          {details[t.id].sections.map((s) => (
                            <li key={s.id}>
                              {s.name}（{s.word_count.min}–{s.word_count.max} 字，{s.weight}）
                            </li>
                          ))}
                        </ul>
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            maxHeight: 320,
                            overflow: "auto",
                            padding: 12,
                            borderRadius: 8,
                            background: "var(--ant-color-bg-container-disabled, #f5f5f5)",
                          }}
                        >
                          {details[t.id].content}
                        </pre>
                      </div>
                    ) : (
                      <Paragraph type="secondary">模板内容加载中…</Paragraph>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

function parseTemplateMarkdown(text: string): TemplateDetail {
  const lines = text.split("\n");
  const contentStart = lines.findIndex((line) => line.startsWith("# "));
  const frontmatter = lines.slice(0, contentStart).join("\n");
  const content = lines.slice(contentStart).join("\n");

  const title = /title:\s*"([^"]+)"/.exec(frontmatter)?.[1] ?? "";
  const sections: TemplateSection[] = [];

  const sectionsMatch = frontmatter.match(/sections:\n([\s\S]*?)(?:\nword_count:|\ntotal:)/);
  if (sectionsMatch) {
    const sectionBlocks = sectionsMatch[1].split("\n- ").slice(1);
    for (const block of sectionBlocks) {
      const id = /id:\s*(\S+)/.exec(block)?.[1] ?? "";
      const name = /name:\s*(.+)/.exec(block)?.[1] ?? "";
      const min = parseInt(/min:\s*(\d+)/.exec(block)?.[1] ?? "0", 10);
      const max = parseInt(/max:\s*(\d+)/.exec(block)?.[1] ?? "0", 10);
      const weight = /weight:\s*(.+)/.exec(block)?.[1] ?? "";
      if (id && name) sections.push({ id, name, word_count: { min, max }, weight });
    }
  }

  const totalMin = parseInt(/total:\n\s+min:\s*(\d+)/.exec(frontmatter)?.[1] ?? "0", 10);
  const totalMax = parseInt(/total:\n\s+max:\s*(\d+)/.exec(frontmatter)?.[1] ?? "0", 10);

  return {
    title,
    sections,
    word_count: { total: { min: totalMin, max: totalMax } },
    content,
  };
}
