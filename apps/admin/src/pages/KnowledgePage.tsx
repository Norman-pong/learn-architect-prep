import { useEffect, useMemo, useState } from "react";
import type { Key } from "react";
import { useNavigate, useParams } from "react-router";
import { Layout, Spin, Tag, Tree, Typography } from "antd";
import type { DataNode } from "antd/es/tree";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

interface ChapterMeta {
  id: string;
  title: string;
  section: string;
  examWeight: number;
  order: number;
}

interface KnowledgePoint {
  id: string;
  title: string;
  examWeight: number;
  file: string;
}

interface ChapterIndex {
  id: string;
  title: string;
  examWeight: number;
  knowledgePoints: KnowledgePoint[];
}

interface SectionNode {
  key: string;
  title: string;
  children: DataNode[];
}

const WEIGHT_COLOR: Record<number, string> = {
  5: "red",
  4: "orange",
  3: "gold",
  2: "default",
  1: "gray",
};

function WeightTag({ weight }: { weight?: number }) {
  if (weight === undefined || weight === null) return null;
  return (
    <Tag color={WEIGHT_COLOR[weight] ?? "default"} style={{ marginLeft: 8 }}>
      {weight}
    </Tag>
  );
}

export default function KnowledgePage() {
  const navigate = useNavigate();
  const { chapterId, kpId } = useParams<{
    chapterId?: string;
    kpId?: string;
  }>();

  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [chapterMap, setChapterMap] = useState<Record<string, ChapterIndex>>({});
  const [content, setContent] = useState<string>("");
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoadingChapters(true);
    fetch("/api/knowledge/chapters")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load chapters");
        return (await res.json()) as { chapters: ChapterMeta[] };
      })
      .then((data) => {
        if (!cancelled) setChapters(data.chapters);
      })
      .catch(() => {
        if (!cancelled) setChapters([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingChapters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    if (!chapterMap[chapterId]) {
      fetch(`/api/knowledge/chapters/${chapterId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load chapter");
          return (await res.json()) as ChapterIndex;
        })
        .then((data) => {
          if (!cancelled) {
            setChapterMap((prev) => ({ ...prev, [chapterId]: data }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setChapterMap((prev) => ({
              ...prev,
              [chapterId]: { id: chapterId, title: chapterId, examWeight: 0, knowledgePoints: [] },
            }));
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  useEffect(() => {
    if (!chapterId || !kpId) {
      setContent("");
      return;
    }
    let cancelled = false;
    setLoadingContent(true);
    fetch(`/api/knowledge/chapters/${chapterId}/${kpId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load knowledge point");
        return await res.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setContent("");
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId, kpId]);

  const treeData: DataNode[] = useMemo(() => {
    const sections: Record<string, SectionNode> = {};
    for (const chapter of chapters) {
      const section = chapter.section || "未分类";
      if (!sections[section]) {
        sections[section] = {
          key: `section-${section}`,
          title: section,
          children: [],
        };
      }
      const details = chapterMap[chapter.id];
      const children: DataNode[] =
        details?.knowledgePoints.map((kp) => ({
          key: `${chapter.id}/${kp.id}`,
          title: (
            <span>
              {kp.title}
              <WeightTag weight={kp.examWeight} />
            </span>
          ),
          isLeaf: true,
        })) ?? [];
      sections[section].children.push({
        key: chapter.id,
        title: (
          <span>
            {chapter.title}
            <WeightTag weight={chapter.examWeight} />
          </span>
        ),
        children,
      });
    }
    return Object.values(sections).toSorted((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  }, [chapters, chapterMap]);

  const selectedKeys = useMemo(() => {
    if (chapterId && kpId) return [`${chapterId}/${kpId}`];
    if (chapterId) return [chapterId];
    return [];
  }, [chapterId, kpId]);

  useEffect(() => {
    const sectionKeys = treeData.map((node) => node.key as Key);
    setExpandedKeys(chapterId ? [...sectionKeys, chapterId] : sectionKeys);
  }, [treeData, chapterId]);

  const handleSelect = (keys: Key[]) => {
    const key = keys[0] as string | undefined;
    if (!key) return;
    if (key.startsWith("section-")) return;
    if (key.includes("/")) {
      const [cid, kid] = key.split("/");
      navigate(`/knowledge/${cid}/${kid}`);
    } else {
      navigate(`/knowledge/${key}`);
    }
  };

  return (
    <Layout style={{ height: "calc(100vh - 64px)" }}>
      <Sider
        width={320}
        theme="light"
        style={{
          borderRight: "1px solid var(--sd-sider-border)",
          overflow: "auto",
          padding: 16,
        }}
      >
        <Title level={5} style={{ marginTop: 0 }}>
          知识体系
        </Title>
        {loadingChapters ? (
          <Spin />
        ) : (
          <Tree
            showLine
            expandedKeys={expandedKeys}
            selectedKeys={selectedKeys}
            treeData={treeData}
            onExpand={(keys) => setExpandedKeys(keys as Key[])}
            onSelect={handleSelect}
          />
        )}
      </Sider>
      <Content style={{ padding: 24, overflow: "auto" }}>
        {loadingContent ? (
          <Spin />
        ) : content ? (
          <div
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              lineHeight: 1.7,
            }}
          >
            {content}
          </div>
        ) : (
          <Text type="secondary">请从左侧选择一个知识点查看详情。</Text>
        )}
      </Content>
    </Layout>
  );
}
