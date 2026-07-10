import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FileTextOutlined,
  PlusOutlined,
  RobotOutlined,
  SaveOutlined,
  DownloadOutlined,
  RotateCcwOutlined,
  CheckCircle2Outlined,
  AlertCircleOutlined,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  THESIS_SECTIONS,
  THESIS_SECTION_TARGETS,
  THESIS_TOTAL_TARGET,
  type ThesisSectionKey,
  type ThesisSections,
} from "@archprep/shared";
import { countTotalWords, countWords } from "@/lib/word-count";
import { exportThesisAsMarkdown } from "@/lib/export-markdown";
import { useWritings, useWriting, useSaveWriting, useDeleteWriting } from "./api";
import { SectionEditor } from "./components/section-editor";
import { WritingList } from "./components/writing-list";

const EMPTY_SECTIONS: ThesisSections = {
  summary: "",
  background: "",
  solution: "",
  reflection: "",
  conclusion: "",
};

const AUTOSAVE_INTERVAL_MS = 30_000;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

function isThesisSectionKey(value: string): value is ThesisSectionKey {
  return (THESIS_SECTIONS as readonly string[]).includes(value);
}

export function WritingWorkbench() {
  const { data: list, isLoading: listLoading } = useWritings();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<ThesisSections>(EMPTY_SECTIONS);
  const [activeTab, setActiveTab] = useState<ThesisSectionKey>("summary");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [dirty, setDirty] = useState(false);
  const [loadingPaper, setLoadingPaper] = useState(false);

  const { data: paper } = useWriting(activeId);
  const saveMutation = useSaveWriting();
  const deleteMutation = useDeleteWriting();

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
    if (paper) {
      setTitle(paper.title);
      setSections({ ...EMPTY_SECTIONS, ...paper.content });
      setDirty(false);
      setSaveState({ kind: "saved", at: Date.now() });
      setActiveTab("summary");
    }
  }, [paper?.id]);

  useEffect(() => {
    if (!dirty) {
      return () => {
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
      };
    }
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
  }, [dirty, sections, title, activeId]);

  async function doSave(opts: { manual: boolean }): Promise<void> {
    if (!dirtyRef.current) return;
    const currentTitle = titleRef.current.trim();
    if (!currentTitle) {
      if (opts.manual) toast.warning("请先填写论文标题");
      return;
    }
    setSaveState({ kind: "saving" });
    try {
      const result = await saveMutation.mutateAsync({
        id: activeIdRef.current ?? undefined,
        title: currentTitle,
        sections: sectionsRef.current,
      });
      setActiveId(result.id);
      setDirty(false);
      setSaveState({ kind: "saved", at: Date.now() });
      if (opts.manual) toast.success("已保存");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "保存失败";
      setSaveState({ kind: "error", message: msg });
      if (opts.manual) toast.error(msg);
    }
  }

  async function loadPaper(id: string): Promise<void> {
    if (dirty && activeId) {
      await doSave({ manual: false });
    }
    setLoadingPaper(true);
    setActiveId(id);
    setLoadingPaper(false);
  }

  function startNewDraft(): void {
    setActiveId(null);
    setTitle("未命名论文");
    setSections(EMPTY_SECTIONS);
    setDirty(true);
    setSaveState({ kind: "idle" });
    setActiveTab("summary");
  }

  function handleSelect(id: string | null): void {
    if (!id) {
      setActiveId(null);
      setTitle("");
      setSections(EMPTY_SECTIONS);
      setDirty(false);
      setSaveState({ kind: "idle" });
      return;
    }
    void loadPaper(id);
  }

  function handleDelete(id: string): void {
    deleteMutation.mutate(id);
    if (id === activeId) {
      setActiveId(null);
      setTitle("");
      setSections(EMPTY_SECTIONS);
      setDirty(false);
      setSaveState({ kind: "idle" });
    }
  }

  function handleExport(): void {
    const safeTitle = title.trim() || "未命名论文";
    exportThesisAsMarkdown(safeTitle, sections);
    toast.success("Markdown 已下载");
  }

  function patchSection(key: ThesisSectionKey, value: string): void {
    setSections((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  const totalStatus = useMemo(() => {
    if (totalWords < THESIS_TOTAL_TARGET.min)
      return { variant: "outline" as const, label: "未达标" };
    if (totalWords > THESIS_TOTAL_TARGET.max)
      return { variant: "destructive" as const, label: "超标" };
    return { variant: "default" as const, label: "达标" };
  }, [totalWords]);

  const saveBadge = (() => {
    switch (saveState.kind) {
      case "idle":
        return dirty ? (
          <Badge variant="outline" className="animate-pulse">
            编辑中
          </Badge>
        ) : (
          <Badge variant="secondary">未保存</Badge>
        );
      case "saving":
        return (
          <Badge variant="outline">
            <RotateCcwOutlined className="mr-1 h-3 w-3 animate-spin" />
            保存中…
          </Badge>
        );
      case "saved":
        return (
          <Badge variant="default">
            <CheckCircle2Outlined className="mr-1 h-3 w-3" />
            已保存 · {new Date(saveState.at).toLocaleTimeString()}
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <AlertCircleOutlined className="mr-1 h-3 w-3" />
            {saveState.message}
          </Badge>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileTextOutlined className="h-5 w-5 text-primary" />
              论文写作工作台
            </CardTitle>
            <CardDescription>分节编辑 · 实时字数 · 30s 自动保存</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="论文标题"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              className="w-full sm:w-72"
              maxLength={120}
            />
            <Button variant="outline" onClick={startNewDraft}>
              <PlusOutlined className="mr-1 h-4 w-4" />
              新建论文
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => toast.info("AI 评分将在 FR-WR-03 中开放")}
                  >
                    <RobotOutlined className="mr-1 h-4 w-4" />
                    AI 评分
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>请先在设置 → AI 配置中配置 API Key</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <WritingList
            items={list ?? []}
            activeId={activeId}
            loading={listLoading}
            onSelect={handleSelect}
            onNew={startNewDraft}
            onDelete={handleDelete}
          />

          {loadingPaper ? (
            <div className="space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-80" />
            </div>
          ) : (
            <>
              <Tabs
                value={activeTab}
                onValueChange={(key) => {
                  const next = isThesisSectionKey(key) ? key : activeTab;
                  setActiveTab(next);
                }}
                className="w-full"
              >
                <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted p-1">
                  {THESIS_SECTIONS.map((key) => {
                    const meta = THESIS_SECTION_TARGETS[key];
                    const count = countWords(sections[key]);
                    const inRange = count >= meta.min && count <= meta.max;
                    const variant = count === 0 ? "outline" : inRange ? "default" : "destructive";
                    return (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="flex items-center gap-2 data-[selected]:bg-card data-[selected]:shadow-sm"
                      >
                        <span>{meta.label}</span>
                        <Badge variant={variant} className="text-xs">
                          {count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {THESIS_SECTIONS.map((key) => (
                  <SectionEditor
                    key={key}
                    sectionKey={key}
                    value={sections[key]}
                    onChange={(v) => patchSection(key, v)}
                  />
                ))}
              </Tabs>

              <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">总字数</span>
                  <span className="font-mono tabular-nums text-sm">
                    {totalWords} / {THESIS_TOTAL_TARGET.min}-{THESIS_TOTAL_TARGET.max}
                  </span>
                  <Badge variant={totalStatus.variant}>{totalStatus.label}</Badge>
                </div>

                <div className="hidden flex-1 md:block" />

                <div className="flex flex-wrap items-center gap-2">
                  {THESIS_SECTIONS.map((k) => (
                    <Button
                      key={k}
                      size="sm"
                      variant={activeTab === k ? "default" : "outline"}
                      onClick={() => setActiveTab(k)}
                    >
                      {THESIS_SECTION_TARGETS[k].label} {countWords(sections[k])}
                    </Button>
                  ))}
                </div>

                <div className="hidden flex-1 md:block" />

                <div className="flex items-center gap-2">
                  {saveBadge}
                  <Button
                    size="sm"
                    onClick={() => void doSave({ manual: true })}
                    disabled={!dirty}
                    className="gap-1"
                  >
                    <SaveOutlined className="h-4 w-4" />
                    保存
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExport} className="gap-1">
                    <DownloadOutlined className="h-4 w-4" />
                    导出 Markdown
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default WritingWorkbench;
