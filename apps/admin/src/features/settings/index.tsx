import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AIConfigForm } from "./components/ai-config-form";
import { CostDashboard } from "./components/cost-dashboard";

export function SettingsAI() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI 设置</h1>
        <p className="text-sm text-muted-foreground">管理 AI 配置和成本监控</p>
      </div>
      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">AI 配置</TabsTrigger>
          <TabsTrigger value="cost">AI 成本</TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="mt-4">
          <AIConfigForm />
        </TabsContent>
        <TabsContent value="cost" className="mt-4">
          <CostDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { AIConfigForm, CostDashboard };
