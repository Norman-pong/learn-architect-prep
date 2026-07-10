import type { BadgeProps } from "@/components/ui/badge";
import type { AnnotationType } from "./types";
export const ANNOTATION_META: Record<
  AnnotationType,
  { label: string; variant: NonNullable<BadgeProps["variant"]>; className?: string }
> = {
  highlight: {
    label: "高亮",
    variant: "outline",
    className: "bg-warning/10 text-warning border-warning",
  },
  note: { label: "笔记", variant: "default" },
  question: { label: "疑问", variant: "destructive" },
};
