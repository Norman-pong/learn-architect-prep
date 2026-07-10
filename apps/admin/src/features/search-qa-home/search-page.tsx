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
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight">知识点搜索</h1>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          placeholder="输入关键词搜索知识点标题和正文"
          className="h-12"
        />
        <Button onClick={handleSearch} disabled={!query.trim()} className="h-12 px-6">
          搜索
        </Button>
      </div>
      <SearchResults results={results} query={searchTerm} loading={isLoading} />
    </div>
  );
}
