// components/snippets/SnippetList.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { Search, Star } from "lucide-react";
import { api } from "@/lib/trpc";
import type { RouterOutputs } from "@/lib/trpc";

type Snippet = RouterOutputs["snippets"]["list"][number];

interface SnippetListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  languageFilter: string;
  onLanguageChange: (v: string) => void;
}

export function SnippetList({
  selectedId,
  onSelect,
  search,
  onSearchChange,
  languageFilter,
  onLanguageChange,
}: SnippetListProps) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: snippets = [], isLoading } = api.snippets.list.useQuery({
    search: debouncedSearch || undefined,
    language: languageFilter || undefined,
  });

  // Derive unique languages from all snippets (unfiltered) for the dropdown
  const { data: allSnippets = [] } = api.snippets.list.useQuery({});
  const languages = useMemo(() => {
    const langs = new Set(allSnippets.map((s) => s.language));
    return Array.from(langs).sort();
  }, [allSnippets]);

  return (
    <div className="flex flex-col h-full border-r border-border-subtle w-[300px] flex-shrink-0">
      {/* Search + filter */}
      <div className="flex flex-col gap-2 px-3 py-3 border-b border-border-subtle">
        {/* Search */}
        <div className="flex items-center gap-2 bg-surface-0 border border-border-default rounded px-2 py-1.5">
          <Search size={13} strokeWidth={1.5} className="text-text-ghost flex-shrink-0" />
          <input
            type="text"
            placeholder="Search snippets..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-ghost outline-none"
          />
        </div>

        {/* Language filter */}
        {languages.length > 0 && (
          <select
            value={languageFilter}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-[12px] text-text-secondary focus:outline-none focus:border-border-strong transition-colors"
          >
            <option value="">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="space-y-1.5 px-3 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded bg-surface-2"
                style={{ opacity: 1 - i * 0.2 }}
              />
            ))}
          </div>
        ) : snippets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4">
            <p className="text-[13px] text-text-secondary text-center">
              {search || languageFilter
                ? "No snippets match your filters."
                : "No snippets yet. Save your first code block."}
            </p>
          </div>
        ) : (
          snippets.map((snippet) => (
            <SnippetItem
              key={snippet.id}
              snippet={snippet}
              isSelected={snippet.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SnippetItem({
  snippet,
  isSelected,
  onSelect,
}: {
  snippet: Snippet;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  // Show first non-empty line as preview
  const preview = snippet.code
    .split("\n")
    .find((l) => l.trim().length > 0)
    ?.trim()
    .slice(0, 60);

  return (
    <button
      onClick={() => onSelect(snippet.id)}
      className={`w-full text-left px-3 py-2.5 transition-colors group ${
        isSelected
          ? "bg-surface-3 border-l-2 border-accent"
          : "hover:bg-surface-2 border-l-2 border-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span
            className={`text-[13px] font-medium truncate ${
              isSelected ? "text-text-primary" : "text-text-primary"
            }`}
          >
            {snippet.title}
          </span>
          {preview && (
            <span className="text-[11px] text-text-ghost font-mono truncate">
              {preview}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {snippet.isFavorite && (
            <Star
              size={11}
              strokeWidth={1.5}
              className="text-accent fill-accent"
            />
          )}
          <span className="text-[10px] text-text-ghost bg-surface-2 px-1.5 py-0.5 rounded font-mono">
            {snippet.language}
          </span>
        </div>
      </div>

      {snippet.tags.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {snippet.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {snippet.tags.length > 3 && (
            <span className="text-[10px] text-text-ghost">
              +{snippet.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
