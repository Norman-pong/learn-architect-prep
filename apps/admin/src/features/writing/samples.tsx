import { useState } from "react";
import { useSamples, useSample } from "./api";
import { SampleViewer } from "./components/sample-viewer";

export function SamplesPage() {
  const { data: samples, isLoading } = useSamples();
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeSlug = samples?.find((s) => s.id === activeId)?.file.replace(/\.md$/, "") ?? null;
  const { data: content, isLoading: contentLoading } = useSample(activeSlug);

  const handleSelect = (id: string) => {
    setActiveId(id);
  };

  return (
    <SampleViewer
      samples={samples ?? []}
      activeId={activeId}
      activeContent={content ?? null}
      loading={isLoading}
      loadingContent={contentLoading}
      onSelect={handleSelect}
    />
  );
}

export default SamplesPage;
