import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RobotOutlined } from "@/components/ui/icons";
import type { ChatMessage } from "../types";

export function ChatMessageBubble({
  message,
  isLast,
  isLoading,
  chapterTitle,
}: {
  message: ChatMessage;
  isLast: boolean;
  isLoading: boolean;
  chapterTitle?: string;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className={cn("h-8 w-8 shrink-0", isUser ? "bg-primary" : "bg-muted")}>
        <AvatarFallback
          className={cn("text-xs", isUser ? "text-primary-foreground" : "text-muted-foreground")}
        >
          {isUser ? "我" : <RobotOutlined className="size-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isLast && isLoading && message.content === "" ? (
          <div className="flex items-center gap-1.5 py-1">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        )}

        {!isUser && message.content && chapterTitle && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-[10px]">
              引用：{chapterTitle}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
