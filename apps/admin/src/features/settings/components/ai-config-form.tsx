import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PROVIDERS } from "../constants";
import { useAIConfig, useSaveAIConfig, useTestAIConfig } from "../api";
import type { AIConfigFormData } from "../types";

const schema = z.object({
  provider: z.enum(["openai", "anthropic", "deepseek", "minimax", "kimi", "custom"]),
  apiKey: z.string().min(1, "API Key 不能为空"),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AIConfigForm() {
  const { data: config, isLoading } = useAIConfig();
  const saveMutation = useSaveAIConfig();
  const testMutation = useTestAIConfig();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: "openai",
      apiKey: "",
      model: "",
      baseUrl: "",
    },
  });

  React.useEffect(() => {
    if (config) {
      form.reset({
        provider: config.provider,
        apiKey: "",
        model: config.model ?? "",
        baseUrl: config.baseUrl ?? "",
      });
    }
  }, [config, form]);

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values as AIConfigFormData);
  };

  const handleTest = () => {
    testMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 配置</CardTitle>
        <CardDescription>配置您的 AI Provider 和 API Key</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Provider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select
              value={form.watch("provider")}
              onValueChange={(value) => form.setValue("provider", value as FormValues["provider"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择 Provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.provider && (
              <p className="text-sm text-destructive">{form.formState.errors.provider.message}</p>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <Input
              type="password"
              placeholder={config ? "已配置，留空保持不变" : "输入 API Key"}
              {...form.register("apiKey")}
            />
            {form.formState.errors.apiKey && (
              <p className="text-sm text-destructive">{form.formState.errors.apiKey.message}</p>
            )}
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium">模型 (可选)</label>
            <Input placeholder="例如 gpt-4, claude-3-opus" {...form.register("model")} />
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Base URL (可选)</label>
            <Input placeholder="自定义 API 地址" {...form.register("baseUrl")} />
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "保存中..." : "保存配置"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testMutation.isPending}
            onClick={handleTest}
          >
            {testMutation.isPending ? "测试中..." : "测试连接"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
