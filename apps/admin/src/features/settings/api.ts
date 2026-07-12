import { useQuery, useMutation } from "@tanstack/react-query";
import { api, getEdenError } from "@/lib/api";
import { toast } from "sonner";
import type {
  AIConfigResponse,
  AICostSummary,
  FeatureUsage,
  AIConfigFormData,
  TestConnectionResult,
} from "./types";

export function useAIConfig() {
  return useQuery<AIConfigResponse | null>({
    queryKey: ["ai-config"],
    queryFn: async () => {
      const { data, error } = await api.api["ai-config"].get();
      if (error) throw new Error(getEdenError(error, "获取配置失败"));
      return data ?? null;
    },
  });
}

export function useSaveAIConfig() {
  return useMutation<AIConfigResponse, Error, AIConfigFormData>({
    mutationFn: async (values) => {
      const { data, error } = await api.api["ai-config"].put({
        provider: values.provider,
        apiKey: values.apiKey,
        model: values.model,
        baseUrl: values.baseUrl,
      });
      if (error) throw new Error(getEdenError(error, "保存失败"));
      if (!data) throw new Error("保存失败");
      return data as AIConfigResponse;
    },
    onSuccess: () => {
      toast.success("保存成功");
    },
    onError: (err) => {
      toast.error(err.message || "保存失败");
    },
  });
}

export function useMaskedKey() {
  return useQuery<{ masked: string } | null>({
    queryKey: ["ai-config", "masked-key"],
    queryFn: async () => {
      const { data, error } = await api.api["ai-config"]["masked-key"].get();
      if (error) return null;
      return data ?? null;
    },
    enabled: false,
  });
}

export function useTestAIConfig() {
  return useMutation<TestConnectionResult, Error, void>({
    mutationFn: async () => {
      const { data, error } = await api.api["ai-config"].test.post();
      if (error) throw new Error(getEdenError(error, "测试失败"));
      if (!data) throw new Error("测试失败");
      return data as TestConnectionResult;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (err) => {
      toast.error(err.message || "测试失败");
    },
  });
}

export function useAICostSummary() {
  return useQuery<AICostSummary>({
    queryKey: ["ai-cost", "summary"],
    queryFn: async () => {
      const { data, error } = await api.api["ai-cost"].summary.get();
      if (error) throw new Error(getEdenError(error, "获取汇总失败"));
      return data as AICostSummary;
    },
  });
}

export function useFeatureUsage() {
  return useQuery<FeatureUsage[]>({
    queryKey: ["ai-cost", "by-feature"],
    queryFn: async () => {
      const { data, error } = await api.api["ai-cost"]["by-feature"].get();
      if (error) throw new Error(getEdenError(error, "获取明细失败"));
      return data as FeatureUsage[];
    },
  });
}
