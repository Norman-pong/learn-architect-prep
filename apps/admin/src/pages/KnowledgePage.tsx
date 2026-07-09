import {
  DeleteOutlined,
  FileTextOutlined,
  HighlightOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Key, ReactNode } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Empty,
  Input,
  Layout,
  List,
  Space,
  Spin,
  Tag,
  Tree,
  Typography,
  theme,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { useNavigate, useParams } from "react-router";

import {
  ANNOTATION_META,
  createAnnotation,
  listAnnotations,
  removeAnnotation,
  type Annotation,
  type AnnotationType,
} from "../lib/annotations-api";

const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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

interface SelectionState {
  text: string;
  startOffset: number;
  endOffset: number;
  x: number;
  y: number;
}

interface DraftAnnotation extends SelectionState {
  type: Exclude<AnnotationType, "highlight">;
  content: string;
}

function isChapterMetaArray(value: unknown): value is ChapterMeta[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.section === "string" &&
        typeof item.examWeight === "number" &&
        typeof item.order === "number",
    )
  );
}

function isChapterIndex(value: unknown): value is ChapterIndex {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.examWeight !== "number"
  )
    return false;
  if (!Array.isArray(value.knowledgePoints)) return false;
  return value.knowledgePoints.every(
    (kp) =>
      isRecord(kp) &&
      typeof kp.id === "string" &&
      typeof kp.title === "string" &&
      typeof kp.examWeight === "number" &&
      typeof kp.file === "string",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const WEIGHT_COLOR: Record<number, string> = {
  5: "error",
  4: "warning",
  3: "processing",
  2: "default",
  1: "default",
};

const ANNOTATION_ICON: Record<AnnotationType, ReactNode> = {
  highlight: <HighlightOutlined />,
  note: <FileTextOutlined />,
  question: <QuestionCircleOutlined />,
};

function WeightTag({ weight }: { weight?: number }) {
  if (weight === undefined || weight === null) return null;
  return (
    <Tag color={WEIGHT_COLOR[weight] ?? "default"} style={{ marginLeft: 8 }}>
      {weight}
    </Tag>
  );
}

function sortAnnotations(a: Annotation, b: Annotation): number {
  return a.createdAt.localeCompare(b.createdAt);
}

export default function KnowledgePage() {
  const navigate = useNavigate();
  const { chapterId, kpId } = useParams<{
    chapterId?: string;
    kpId?: string;
  }>();
  const { message } = AntdApp.useApp();
  const { token } = theme.useToken();
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [chapters, setChapters] = useState<ChapterMeta[]>([]);
  const [chapterMap, setChapterMap] = useState<Record<string, ChapterIndex>>({});
  const [content, setContent] = useState<string>("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [savingAnnotation, setSavingAnnotation] = useState(false);
  const [deletingAnnotationId, setDeletingAnnotationId] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [selectionMenu, setSelectionMenu] = useState<SelectionState | null>(null);
  const [draftAnnotation, setDraftAnnotation] = useState<DraftAnnotation | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingChapters(true);
    fetch("/api/knowledge/chapters")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load chapters");
        const data = await res.json();
        if (isRecord(data) && isChapterMetaArray(data.chapters)) {
          if (!cancelled) setChapters(data.chapters);
        } else {
          if (!cancelled) setChapters([]);
        }
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
    if (!chapterId) {
      return () => {};
    }
    let cancelled = false;
    if (!chapterMap[chapterId]) {
      fetch(`/api/knowledge/chapters/${chapterId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load chapter");
          const data = await res.json();
          if (isChapterIndex(data)) {
            if (!cancelled) {
              setChapterMap((prev) => ({ ...prev, [chapterId]: data }));
            }
          } else {
            throw new Error("Invalid chapter data");
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
  }, [chapterId, chapterMap]);

  useEffect(() => {
    setSelectionMenu(null);
    setDraftAnnotation(null);
    if (!chapterId || !kpId) {
      setContent("");
      return () => {};
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

  useEffect(() => {
    if (!kpId) {
      setAnnotations([]);
      return () => {};
    }
    let cancelled = false;
    setLoadingAnnotations(true);
    listAnnotations(kpId)
      .then((items) => {
        if (!cancelled) setAnnotations(items.toSorted(sortAnnotations));
      })
      .catch((err) => {
        if (!cancelled) {
          setAnnotations([]);
          message.error(err instanceof Error ? err.message : "加载标注失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAnnotations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kpId, message]);

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

  const currentKnowledgePoint = useMemo(() => {
    if (!chapterId || !kpId) return null;
    return chapterMap[chapterId]?.knowledgePoints.find((kp) => kp.id === kpId) ?? null;
  }, [chapterId, chapterMap, kpId]);

  const sidebarAnnotations = useMemo(() => annotations.toSorted(sortAnnotations), [annotations]);

  useEffect(() => {
    const sectionKeys = treeData.map((node) => node.key);
    setExpandedKeys(chapterId ? [...sectionKeys, chapterId] : sectionKeys);
  }, [treeData, chapterId]);

  const handleSelect = (keys: Key[]) => {
    const key = keys[0];
    if (typeof key !== "string") return;
    if (!key) return;
    if (key.startsWith("section-")) return;
    if (key.includes("/")) {
      const [cid, kid] = key.split("/");
      void navigate(`/learn/${cid}/${kid}`);
    } else {
      void navigate(`/learn/${key}`);
    }
  };

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelectionMenu(null);
  }, []);

  const handleTextSelection = useCallback(() => {
    const container = contentRef.current;
    if (!container || !content || !kpId) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    const selectedText = selection.toString();
    if (!selectedText.trim()) {
      setSelectionMenu(null);
      return;
    }

    const beforeSelection = document.createRange();
    beforeSelection.selectNodeContents(container);
    beforeSelection.setEnd(range.startContainer, range.startOffset);
    const startOffset = beforeSelection.toString().length;
    const endOffset = startOffset + selectedText.length;
    if (endOffset <= startOffset || endOffset > content.length) return;

    const rect = range.getBoundingClientRect();
    setDraftAnnotation(null);
    setSelectionMenu({
      text: selectedText,
      startOffset,
      endOffset,
      x: Math.min(
        Math.max(token.padding, rect.left + rect.width / 2 - 116),
        window.innerWidth - 248,
      ),
      y: Math.max(token.padding, rect.top - 56),
    });
  }, [content, kpId, token.padding]);

  const saveAnnotation = useCallback(
    async (type: AnnotationType, annotationContent: string, selection: SelectionState) => {
      if (!kpId) return;
      const trimmed = annotationContent.trim();
      if (!trimmed) {
        message.warning(type === "highlight" ? "请选择要高亮的文本" : "请先填写标注内容");
        return;
      }

      setSavingAnnotation(true);
      try {
        const fullContent = type === "highlight" ? trimmed : `「${selection.text}」\n${trimmed}`;
        const annotation = await createAnnotation({
          knowledgePointId: kpId,
          type,
          content: fullContent,
        });
        setAnnotations((prev) => [...prev, annotation].toSorted(sortAnnotations));
        message.success(`${ANNOTATION_META[type].label}已保存`);
        setDraftAnnotation(null);
        clearSelection();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "保存标注失败");
      } finally {
        setSavingAnnotation(false);
      }
    },
    [clearSelection, kpId, message],
  );

  const handleCreateFromSelection = (type: AnnotationType) => {
    if (!selectionMenu) return;
    if (type === "highlight") {
      void saveAnnotation(type, selectionMenu.text, selectionMenu);
      return;
    }
    setDraftAnnotation({ ...selectionMenu, type, content: "" });
    setSelectionMenu(null);
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    setDeletingAnnotationId(annotationId);
    try {
      await removeAnnotation(annotationId);
      setAnnotations((prev) => prev.filter((item) => item.id !== annotationId));
      message.success("标注已删除");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除标注失败");
    } finally {
      setDeletingAnnotationId(null);
    }
  };

  const renderContent = () => (
    <div
      ref={contentRef}
      role="article"
      tabIndex={0}
      aria-label="知识点正文，选中文本后可添加标注"
      onKeyUp={handleTextSelection}
      onMouseUp={handleTextSelection}
      style={{ outline: "none" }}
    >
      {content ? <MarkdownRenderer content={content} /> : null}
    </div>
  );

  const renderAnnotationPanel = () => (
    <Card
      size="small"
      title="本知识点标注"
      extra={<Tag color="default">{annotations.length}</Tag>}
      loading={loadingAnnotations}
      style={{
        flex: "0 1 340px",
        maxWidth: 360,
        position: "sticky",
        top: 0,
      }}
    >
      {sidebarAnnotations.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无标注" />
      ) : (
        <List
          size="small"
          dataSource={sidebarAnnotations}
          renderItem={(annotation) => {
            const meta = ANNOTATION_META[annotation.type];
            const selectedText = annotation.content;
            return (
              <List.Item
                actions={[
                  <Button
                    key="delete"
                    aria-label="删除标注"
                    icon={<DeleteOutlined />}
                    loading={deletingAnnotationId === annotation.id}
                    size="small"
                    type="text"
                    danger
                    onClick={() => void handleDeleteAnnotation(annotation.id)}
                  />,
                ]}
              >
                <Space direction="vertical" size={token.marginXXS} style={{ width: "100%" }}>
                  <Space size={token.marginXS} wrap>
                    <Tag color={meta.color} icon={ANNOTATION_ICON[annotation.type]}>
                      {meta.label}
                    </Tag>
                    {annotation.startOffset !== null && annotation.endOffset !== null && (
                      <Text type="secondary">
                        {annotation.startOffset}–{annotation.endOffset}
                      </Text>
                    )}
                  </Space>
                  {annotation.type === "highlight" ? (
                    <Text>{selectedText}</Text>
                  ) : (
                    <Card size="small" style={{ background: token.colorBgLayout }}>
                      <Paragraph style={{ marginBottom: token.marginXS }}>
                        {annotation.content}
                      </Paragraph>
                      <Text type="secondary">原文：{selectedText}</Text>
                    </Card>
                  )}
                </Space>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );

  return (
    <Layout style={{ height: "calc(100vh - 64px)" }}>
      <Sider
        width={320}
        theme="light"
        style={{
          borderRight: "1px solid var(--sd-sider-border)",
          overflow: "auto",
          padding: token.padding,
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
            onExpand={(keys) => setExpandedKeys(keys)}
            onSelect={handleSelect}
          />
        )}
      </Sider>
      <Content style={{ padding: token.paddingLG, overflow: "auto" }}>
        {loadingContent ? (
          <Spin />
        ) : content ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: token.paddingLG,
                flexWrap: "wrap",
              }}
            >
              <Card
                title={currentKnowledgePoint?.title ?? "知识点详情"}
                extra={
                  currentKnowledgePoint ? (
                    <Space>
                      <Button
                        size="small"
                        onClick={() => navigate(`/qa/${chapterId}/${currentKnowledgePoint.id}`)}
                      >
                        AI 答疑
                      </Button>
                      <WeightTag weight={currentKnowledgePoint.examWeight} />
                    </Space>
                  ) : null
                }
                style={{ flex: "1 1 560px", minWidth: 0 }}
              >
                <Paragraph type="secondary">
                  选中文本后，可添加高亮、笔记或疑问；标注会同步到复习卡片。
                </Paragraph>
                {renderContent()}
              </Card>
              {renderAnnotationPanel()}
            </div>

            {selectionMenu && (
              <Card
                size="small"
                style={{
                  position: "fixed",
                  left: selectionMenu.x,
                  top: selectionMenu.y,
                  zIndex: token.zIndexPopupBase,
                  boxShadow: token.boxShadowSecondary,
                }}
              >
                <Space size={token.marginXS} role="toolbar" aria-label="标注菜单">
                  <Button
                    icon={<HighlightOutlined />}
                    loading={savingAnnotation}
                    size="small"
                    onClick={() => handleCreateFromSelection("highlight")}
                  >
                    高亮
                  </Button>
                  <Button
                    icon={<FileTextOutlined />}
                    size="small"
                    onClick={() => handleCreateFromSelection("note")}
                  >
                    笔记
                  </Button>
                  <Button
                    icon={<QuestionCircleOutlined />}
                    size="small"
                    onClick={() => handleCreateFromSelection("question")}
                  >
                    疑问
                  </Button>
                </Space>
              </Card>
            )}

            {draftAnnotation && (
              <Card
                title={`添加${ANNOTATION_META[draftAnnotation.type].label}`}
                size="small"
                style={{
                  position: "fixed",
                  left: Math.min(draftAnnotation.x, window.innerWidth - 360),
                  top: draftAnnotation.y + token.controlHeightLG,
                  width: 320,
                  zIndex: token.zIndexPopupBase,
                  boxShadow: token.boxShadowSecondary,
                }}
              >
                <Space direction="vertical" size={token.marginSM} style={{ width: "100%" }}>
                  <Text type="secondary">原文：{draftAnnotation.text}</Text>
                  <TextArea
                    autoFocus
                    value={draftAnnotation.content}
                    rows={4}
                    placeholder={
                      draftAnnotation.type === "note" ? "写下你的理解或补充" : "记录这里的疑问"
                    }
                    onChange={(event) =>
                      setDraftAnnotation((prev) =>
                        prev ? { ...prev, content: event.target.value } : prev,
                      )
                    }
                  />
                  <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                    <Button
                      onClick={() => {
                        setDraftAnnotation(null);
                        clearSelection();
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      type="primary"
                      loading={savingAnnotation}
                      onClick={() =>
                        void saveAnnotation(
                          draftAnnotation.type,
                          draftAnnotation.content,
                          draftAnnotation,
                        )
                      }
                    >
                      保存
                    </Button>
                  </Space>
                </Space>
              </Card>
            )}
          </>
        ) : (
          <Text type="secondary">请从左侧选择一个知识点查看详情。</Text>
        )}
      </Content>
    </Layout>
  );
}
