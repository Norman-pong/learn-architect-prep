import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CloudSyncOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import {
  THESIS_SECTIONS,
  THESIS_SECTION_TARGETS,
  THESIS_TOTAL_TARGET,
  type ThesisSectionKey,
  type ThesisSections,
  type Writing,
  type WritingSummary,
} from "@archprep/shared";

import {
  deleteWriting,
  getWriting,
  listWritings,
  upsertWriting,
} from "../lib/writings-api";
import { exportThesisAsMarkdown } from "../lib/export-markdown";
import { countTotalWords, countWords } from "../lib/word-count";

const { Title, Text } = Typography;
const { TextArea } = Input;

const AUTOSAVE_INTERVAL_MS = 30_000;

const EMPTY_SECTIONS: ThesisSections = {
  summary: "",
  background: "",
  solution: "",
  reflection: "",
  conclusion: "",
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

/**
 * Thesis writing workbench (FR-WR-05).
 *
 * Layout:
 *   Toolbar: 标题 | 新建 | 论文下拉 | 删除 | AI 评分
 *   Tabs:    摘要 / 项目背景 / 技术方案 / 效果反思 / 结论
 *     ├ 节标题 + 区间徽标 + 当前字数
 *     └ TextArea
 *   Sticky footer: 总字数 · 保存状态 · 保存 / 导出 Markdown
 *
 * Persistence:
 *   - "保存" button -> immediate POST.
 *   - Autosave debounce (30s) after any edit if dirty.
 *   - Switching papers or starting a new one flushes the pending autosave.
 */
export function WritingWorkbench() {
  const [list, setList] = useState<WritingSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<ThesisSections>(EMPTY_SECTIONS);
  const [activeTab, setActiveTab] = useState<ThesisSectionKey>("summary");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [dirty, setDirty] = useState(false);
  const [loadingPaper, setLoadingPaper] = useState(false);

  // Refs let the autosave timer / async callbacks read the latest values
  // without re-subscribing on every keystroke.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const titleRef = useRef(title);
  titleRef.current = title;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const saveTimerRef = useRef<number | null>(null);

  const totalWords = useMemo(() => countTotalWords(sections), [sections]);

  useEffect(() => {
    void refreshList();
  }, []);

  // Autosave: arm a 30s timer whenever the draft is dirty; cancel on clean.
  useEffect(() => {
    if (!dirty) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void doSave({ manual: false });
    }, AUTOSAVE_INTERVAL_MS);
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
    // doSave reads latest state via refs; intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, sections, title, activeId]);

  async function refreshList(): Promise<void> {
    setListLoading(true);
    try {
      const data = await listWritings();
      setList(data);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "加载论文列表失败");
    } finally {
      setListLoading(false);
    }
  }

  async function loadPaper(id: string): Promise<void> {
    if (dirty && activeId) {
      await doSave({ manual: false });
    }
    setLoadingPaper(true);
    try {
      const data: Writing | null = await getWriting(id);
      if (!data) {
        message.error("论文不存在或已删除");
        return;
      }
      setActiveId(data.id);
      setTitle(data.title);
      setSections({ ...EMPTY_SECTIONS, ...data.content });
      setDirty(false);
      setSaveState({ kind: "saved", at: Date.now() });
      setActiveTab("summary");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "加载论文失败");
    } finally {
      setLoadingPaper(false);
    }
  }

  function startNewDraft(): void {
    setActiveId(null);
    setTitle("未命名论文");
    setSections(EMPTY_SECTIONS);
    setDirty(true);
    setSaveState({ kind: "idle" });
    setActiveTab("summary");
    void doSave({ manual: false });
  }

  async function doSave(opts: { manual: boolean }): Promise<void> {
    if (!dirtyRef.current) return;
    const currentTitle = titleRef.current.trim();
    if (!currentTitle) {
      message.warning("请先填写论文标题");
      return;
    }
    setSaveState({ kind: "saving" });
    try {
      const result = await upsertWriting({
        id: activeIdRef.current ?? undefined,
        title: currentTitle,
        sections: sectionsRef.current,
      });
      setActiveId(result.id);
      setDirty(false);
      setSaveState({ kind: "saved", at: Date.now() });
      await refreshList();
      if (opts.manual) {
        message.success("已保存");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "保存失败";
      setSaveState({ kind: "error", message: msg });
      if (opts.manual) {
        message.error(msg);
      }
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await deleteWriting(id);
      message.success("已删除");
      if (id === activeId) {
        setActiveId(null);
        setTitle("");
        setSections(EMPTY_SECTIONS);
        setDirty(false);
        setSaveState({ kind: "idle" });
      }
      await refreshList();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  function handleExport(): void {
    const safeTitle = title.trim() || "未命名论文";
    exportThesisAsMarkdown(safeTitle, sections);
    message.success("Markdown 已下载");
  }


  // ---- Derived UI bits ----

  function patchSection(key: ThesisSectionKey, value: string): void {
    setSections((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  // ---- Derived UI bits ----

  const sectionItems = THESIS_SECTIONS.map((key) => {
    const meta = THESIS_SECTION_TARGETS[key];
    const count = countWords(sections[key]);
    const inRange = count >= meta.min && count <= meta.max;
    const tagColor = count === 0 ? "default" : inRange ? "success" : "warning";
    return {
      key,

      label: (
        <Space size={6}>
          <span>{meta.label}</span>
          <Tag color={tagColor} style={{ marginInlineEnd: 0 }}>
            {count}
          </Tag>
        </Space>
      ),
      children: (
        <SectionEditor
          sectionKey={key}
          value={sections[key]}
          onChange={(v) => patchSection(key, v)}
        />
      ),
    };
  });

  const totalTag = (() => {
    if (totalWords < THESIS_TOTAL_TARGET.min) return <Tag color="warning">未达标</Tag>;
    if (totalWords > THESIS_TOTAL_TARGET.max) return <Tag color="error">超标</Tag>;
    return <Tag color="success">达标</Tag>;
  })();

  const saveBadge = (() => {
    switch (saveState.kind) {
      case "idle":
        return dirty ? (
          <Badge status="processing" text="编辑中" />
        ) : (
          <Badge status="default" text="未保存" />
        );
      case "saving":
        return <Badge status="processing" text="保存中…" />;
      case "saved":
        return (
          <Badge
            status="success"
            text={`已保存 · ${new Date(saveState.at).toLocaleTimeString()}`}
          />
        );
      case "error":
        return <Badge status="error" text={saveState.message} />;
    }
  })();

  return (
    <Card
      loading={loadingPaper}
      title={
        <Space size="middle" wrap>
          <FileTextOutlined />
          <Title level={4} style={{ margin: 0 }}>
            论文写作工作台
          </Title>
          <Text type="secondary">分节编辑 · 实时字数 · 30s 自动保存</Text>
        </Space>
      }
      extra={
        <Space size="small" wrap>
          <Input
            placeholder="论文标题"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            style={{ width: 240 }}
            allowClear
            maxLength={120}
          />
          <Tooltip title="新建一篇论文">
            <Button icon={<PlusOutlined />} onClick={startNewDraft}>
              新建论文
            </Button>
          </Tooltip>
          <Button icon={<RobotOutlined />} onClick={notifyAiScoreUnavailable} aria-label="请求 AI 评分">
            AI 评分
          </Button>
        </Space>
      }
    >
      <Space style={{ marginBottom: 12 }} wrap>
        <Text type="secondary">论文列表：</Text>
        <Select
          style={{ minWidth: 280 }}
          loading={listLoading}
          placeholder="选择一篇论文进行编辑"
          value={activeId ?? undefined}
          allowClear
          onChange={(value: string | undefined) => {
            if (!value) {
              setActiveId(null);
              setTitle("");
              setSections(EMPTY_SECTIONS);
              setDirty(false);
              setSaveState({ kind: "idle" });
              return;
            }
            void loadPaper(value);
          }}
          options={list.map((item) => ({
            value: item.id,
            label: `${item.title} · ${item.wordCount} 字 · ${new Date(item.updatedAt).toLocaleString()}`,
          }))}
          notFoundContent={
            listLoading ? "加载中…" : <Empty description="还没有论文，点击右上角新建" />
          }
        />
        {activeId ? (
          <Popconfirm
            title="删除当前论文?"
            description="此操作不可撤销"
            okText="删除"
            okType="danger"
            cancelText="取消"
            onConfirm={() => void handleDelete(activeId)}
          >
            <Button danger icon={<DeleteOutlined />}>
              删除当前论文
            </Button>
          </Popconfirm>
        ) : null}
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ThesisSectionKey)}
        items={sectionItems}
        destroyOnHidden={false}
      />

      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 8,
          background: "var(--ant-color-bg-elevated)",
          border: "1px solid var(--ant-color-border-secondary)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Space size={6}>
          <Text strong>总字数</Text>
          <Text style={{ fontVariantNumeric: "tabular-nums" }}>
            {totalWords} / {THESIS_TOTAL_TARGET.min}-{THESIS_TOTAL_TARGET.max}
          </Text>
          {totalTag}
        </Space>
        <Segmented
          options={THESIS_SECTIONS.map((k) => ({
            value: k,
            label: `${THESIS_SECTION_TARGETS[k].label} ${countWords(sections[k])}`,
          }))}
          value={activeTab}
          onChange={(v) => setActiveTab(v as ThesisSectionKey)}
          aria-label="快速跳转到分节"
        />
        <div style={{ flex: 1 }} />
        {saveBadge}
        <Tooltip title="立即保存当前草稿">
          <Button
            icon={<SaveOutlined />}
            loading={saveState.kind === "saving"}
            onClick={() => void doSave({ manual: true })}
            disabled={!dirty}
          >
            保存
          </Button>
        </Tooltip>
        <Tooltip title="下载当前内容为 Markdown 文件">
          <Button icon={<CloudSyncOutlined />} onClick={handleExport}>
            导出 Markdown
          </Button>
        </Tooltip>
      </div>
    </Card>
  );
}

function notifyAiScoreUnavailable(): void {
  message.info("请先在设置 → AI 配置中配置 API Key，AI 评分将在 FR-WR-03 中开放。");
}

interface SectionEditorProps {
  sectionKey: ThesisSectionKey;
  value: string;
  onChange: (next: string) => void;
}

function SectionEditor({ sectionKey, value, onChange }: SectionEditorProps) {
  const meta = THESIS_SECTION_TARGETS[sectionKey];
  const count = countWords(value);
  const status = (() => {
    if (count === 0) return { color: "default" as const, label: "未开始" };
    if (count < meta.min) return { color: "warning" as const, label: `未达下限（${meta.min}）` };
    if (count > meta.max) return { color: "error" as const, label: `超出上限（${meta.max}）` };
    return { color: "success" as const, label: "字数合格" };
  })();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Space size={8}>
          <Text strong>{meta.label}</Text>
          <Badge
            count={`${count} 字`}
            showZero
            color={status.color === "default" ? undefined : status.color}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            建议 {meta.min}-{meta.max} 字
          </Text>
        </Space>
        <Tag color={status.color}>{status.label}</Tag>
      </div>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`请输入${meta.label}（推荐 ${meta.min}-${meta.max} 字）…`}
        autoSize={{ minRows: 8, maxRows: 24 }}
        maxLength={6000}
        showCount={false}
        aria-label={`${meta.label}编辑区`}
      />
    </div>
  );
}

export default WritingWorkbench;