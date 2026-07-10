import { SectionPageLayout } from "@/components/layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearch } from "./api";
import { SearchResults } from "./components/search-results";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: results = [], isLoading } = useSearch(searchTerm);

  const handleSearch = () => {
    const trimmed = query.trim();
    setSearchTerm(trimmed);
  };

  return (
    <SectionPageLayout title="知识点搜索" description="全库搜索知识点标题和正文">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          placeholder="输入关键词搜索知识点标题和正文"
          className="h-11 sm:h-12"
        />
        <Button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="h-11 w-full sm:h-12 sm:w-auto sm:px-6"
        >
          搜索
        </Button>
      </div>
      <SearchResults results={results} query={searchTerm} loading={isLoading} />
    </SectionPageLayout>
  );
}
