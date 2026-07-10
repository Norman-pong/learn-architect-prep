import type { Provider } from "@archprep/shared";

export const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "minimax", label: "MiniMax" },
  { value: "kimi", label: "Kimi" },
  { value: "custom", label: "自定义" },
];

export const FEATURE_LABEL: Record<string, string> = {
  选题: "AI 智能选题",
  评分: "AI 论文/案例评分",
  答疑: "AI 知识点答疑",
};

export function featureLabel(feature: string): string {
  return FEATURE_LABEL[feature] ?? feature;
}

export function providerBadgeVariant(
  provider: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (provider) {
    case "openai":
      return "default";
    case "anthropic":
      return "secondary";
    case "deepseek":
      return "default";
    case "minimax":
      return "outline";
    case "kimi":
      return "secondary";
    default:
      return "outline";
  }
}
