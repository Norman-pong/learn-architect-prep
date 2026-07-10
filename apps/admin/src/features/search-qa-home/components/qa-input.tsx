import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendOutlined } from "@/components/ui/icons";

export function QAInput({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!loading && value.trim()) onSubmit();
      }
    },
    [loading, value, onSubmit],
  );

  return (
    <div className="flex items-end gap-2 border-t border-border bg-card p-2 sm:p-3">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入问题，按 Enter 发送，Shift+Enter 换行..."
        autoResize
        disabled={loading || disabled}
        className="min-h-[44px] max-h-[160px] resize-none rounded-xl border-border/60 bg-background py-2.5"
      />
      <Button
        size="icon"
        className="h-11 w-11 shrink-0 rounded-xl sm:h-10 sm:w-10"
        onClick={onSubmit}
        disabled={!value.trim() || loading || disabled}
      >
        <SendOutlined className="size-[18px]" />
      </Button>
    </div>
  );
}
