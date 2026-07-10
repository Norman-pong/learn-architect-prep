import { SectionPageLayout } from "@/components/layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AIConfigForm } from "./components/ai-config-form";
import { CostDashboard } from "./components/cost-dashboard";

export function SettingsAI() {
  return (
    <SectionPageLayout title="设置" description="AI 配置与系统设置">
      <Tabs defaultValue="config">
        <TabsList className="flex w-full flex-col sm:flex-row">
          <TabsTrigger value="config" className="flex-1">
            AI 配置
          </TabsTrigger>
          <TabsTrigger value="cost" className="flex-1">
            AI 成本
          </TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="mt-4">
          <AIConfigForm />
        </TabsContent>
        <TabsContent value="cost" className="mt-4">
          <CostDashboard />
        </TabsContent>
      </Tabs>
    </SectionPageLayout>
  );
}

export { AIConfigForm, CostDashboard };
