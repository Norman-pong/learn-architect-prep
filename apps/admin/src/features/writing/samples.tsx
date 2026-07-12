import { SectionPageLayout } from "@/components/layout";
import { useState } from "react";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import { useSamples, useSample } from "./api";
import { SampleViewer } from "./components/sample-viewer";

export function SamplesPage() {
  const vh = useViewportHeight();
  const { data: samples, isLoading } = useSamples();
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeSlug = samples?.find((s) => s.id === activeId)?.file.replace(/\.md$/, "") ?? null;
  const { data: content, isLoading: contentLoading } = useSample(activeSlug);

  const handleSelect = (id: string) => {
    setActiveId(id);
  };

  return (
    <SectionPageLayout
      title="论文范文"
      description="10 大高频主题范文"
      style={{ "--app-h": vh > 0 ? `${vh}px` : "100vh" } as React.CSSProperties}
    >
      <SampleViewer
        samples={samples ?? []}
        activeId={activeId}
        activeContent={content ?? null}
        loading={isLoading}
        loadingContent={contentLoading}
        onSelect={handleSelect}
      />
    </SectionPageLayout>
  );
}

export default SamplesPage;
