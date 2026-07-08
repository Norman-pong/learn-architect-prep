import { SearchOutlined } from "@ant-design/icons";
import { Card, Empty, Input, List, Space, Tag, Typography } from "antd";
import { useState } from "react";

import { api } from "../api/eden";

const { Title, Text } = Typography;

interface SearchResult {
  kpId: string;
  title: string;
  chapterId: string;
  chapterName: string;
  snippet: string;
  highlights: string[];
}

function isSearchResult(value: unknown): value is SearchResult {
  const record = typeof value === "object" && value !== null ? value : null;
  if (!record) return false;
  const r: Record<string, unknown> = record;
  return (
    typeof r.kpId === "string" &&
    typeof r.title === "string" &&
    typeof r.chapterId === "string" &&
    typeof r.chapterName === "string" &&
    typeof r.snippet === "string" &&
    Array.isArray(r.highlights) &&
    r.highlights.every((h) => typeof h === "string")
  );
}

function buildHighlighted(text: string, terms: string[]): React.ReactNode {
  if (terms.length === 0) return text;
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "giu",
  );
  const parts = text.split(pattern);
  return parts.map((part, idx) =>
    pattern.test(part) ? (
      <mark key={idx} style={{ background: "#ffe58f", padding: "0 2px", borderRadius: 2 }}>
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.search.index.get({ query: { q: trimmed } });
      const raw = res.data?.results;
      if (Array.isArray(raw) && raw.every(isSearchResult)) {
        setResults(raw);
      } else {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <Title level={3}>知识点搜索</Title>
      <Input.Search
        placeholder="输入关键词搜索知识点标题和正文"
        enterButton={
          <>
            <SearchOutlined /> 搜索
          </>
        }
        size="large"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onSearch={handleSearch}
        loading={loading}
        allowClear
      />
      <Space direction="vertical" style={{ width: "100%", marginTop: 24 }}>
        {results.length === 0 && !loading && query.trim() && (
          <Empty description="未找到匹配的知识点" />
        )}
        {results.length > 0 && (
          <List
            dataSource={results}
            renderItem={(item) => {
              const terms = query.trim().split(/\s+/).filter(Boolean);
              return (
                <List.Item>
                  <Card style={{ width: "100%" }} bodyStyle={{ padding: 16 }}>
                    <Space direction="vertical" style={{ width: "100%" }} size="small">
                      <Title level={5} style={{ margin: 0 }}>
                        {buildHighlighted(item.title, terms)}
                      </Title>
                      <Space size="small">
                        <Tag color="blue">{item.chapterName}</Tag>
                        <Text type="secondary">{item.chapterId}</Text>
                      </Space>
                      <Text>{buildHighlighted(item.snippet, terms)}</Text>
                    </Space>
                  </Card>
                </List.Item>
              );
            }}
          />
        )}
      </Space>
    </div>
  );
}

export default SearchPage;
