import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileTextOutlined, PlusOutlined, DeleteOutlined } from "@/components/ui/icons";
import type { WritingSummary } from "@archprep/shared";

interface WritingListProps {
  items: WritingSummary[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function WritingList({
  items,
  activeId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: WritingListProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const activeItem = items.find((i) => i.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileTextOutlined className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            论文列表 {items.length > 0 && `（${items.length} 篇）`}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onNew}>
          <PlusOutlined className="h-4 w-4 mr-1" />
          新建
        </Button>
      </div>

      <Select value={activeId ?? ""} onValueChange={(v) => onSelect(v || null)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? "加载中…" : "选择一篇论文进行编辑"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">新建论文</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.title} · {item.wordCount} 字 · {new Date(item.updatedAt).toLocaleString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeItem && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{activeItem.title}</p>
            <p className="text-xs text-muted-foreground">
              {activeItem.wordCount} 字 · 更新于 {new Date(activeItem.updatedAt).toLocaleString()}
            </p>
          </div>
          <Dialog
            open={deleteTarget === activeItem.id}
            onOpenChange={(open) => setDeleteTarget(open ? activeItem.id : null)}
          >
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <DeleteOutlined className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>删除论文</DialogTitle>
                <DialogDescription>
                  确定要删除《{activeItem.title}》吗？此操作不可撤销。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete(activeItem.id);
                    setDeleteTarget(null);
                  }}
                >
                  删除
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
