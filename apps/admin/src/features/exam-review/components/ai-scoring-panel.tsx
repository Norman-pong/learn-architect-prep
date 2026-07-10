import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RobotOutlined, CloseCircleOutlined } from "@/components/ui/icons";
import { useAiScoring } from "../lib/use-ai-scoring";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface AiScoringPanelProps {
  writingId: string;
}

export function AiScoringPanel({ writingId }: AiScoringPanelProps) {
  const { start, stop, isStreaming, chunks, done, error } = useAiScoring();
  const [open, setOpen] = React.useState(false);
  const content = React.useMemo(() => chunks.join(""), [chunks]);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          start({ writingId });
        }}
        className="gap-1.5"
      >
        <RobotOutlined className="h-4 w-4" />
        AI 实时评分
      </Button>
    );
  }

  return (
    <Card className="mt-4 border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <RobotOutlined className="h-4 w-4 text-primary" />
            AI 实时评分
            {isStreaming && (
              <Badge variant="secondary" className="animate-pulse">
                评分中…
              </Badge>
            )}
            {done && <Badge variant="default">已完成</Badge>}
            {error && <Badge variant="destructive">出错</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <Button variant="ghost" size="sm" onClick={stop}>
                停止
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <CloseCircleOutlined className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : content ? (
          <div className="max-h-[400px] overflow-y-auto rounded-md bg-muted/50 p-3">
            <MarkdownRenderer content={content} />
          </div>
        ) : isStreaming ? (
          <p className="text-sm animate-pulse text-muted-foreground">正在连接 AI 评分服务…</p>
        ) : (
          <p className="text-sm text-muted-foreground">等待开始评分…</p>
        )}
      </CardContent>
    </Card>
  );
}
