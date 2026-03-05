// components/snippets/SnippetsPage.tsx
"use client";

import { useState, useEffect } from "react";
import { SnippetList } from "./SnippetList";
import { SnippetDetail } from "./SnippetDetail";
import { AddSnippetModal } from "./AddSnippetModal";
import { api } from "@/lib/trpc";
import { Code2 } from "lucide-react";

export function SnippetsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");

  // Always fetch selected snippet when one is selected — ready for edit without extra query on click
  const { data: selectedSnippet } = api.snippets.byId.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );

  // N shortcut to create
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleEdit() {
    setIsEditing(true);
  }

  function handleDelete() {
    setSelectedId(null);
    setIsEditing(false);
  }

  function handleModalClose() {
    setModalOpen(false);
    setIsEditing(false);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-end justify-between border-b border-border-subtle px-6 py-4 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[32px] leading-none text-text-primary">
            Snippets
          </h1>
          <p className="text-[12px] text-text-tertiary tracking-wide">
            Save, search, and copy code blocks
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          + New Snippet
        </button>
      </div>

      {/* Body — split panel */}
      <div className="flex flex-1 overflow-hidden">
        <SnippetList
          selectedId={selectedId}
          onSelect={setSelectedId}
          search={search}
          onSearchChange={setSearch}
          languageFilter={languageFilter}
          onLanguageChange={setLanguageFilter}
        />

        {/* Right panel */}
        <div className="flex-1 overflow-hidden">
          {selectedId ? (
            <SnippetDetail
              key={selectedId}
              snippetId={selectedId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <Code2
                size={28}
                strokeWidth={1}
                className="text-text-ghost"
              />
              <p className="text-[14px] text-text-secondary">
                Select a snippet to view it.
              </p>
              <p className="text-[13px] text-text-ghost">
                Press <kbd className="kbd">N</kbd> to create one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal — key forces remount: edit uses snippet id, create uses "new" */}
      <AddSnippetModal
        key={isEditing ? `edit-${selectedId}` : "new"}
        open={modalOpen || isEditing}
        onClose={handleModalClose}
        snippet={isEditing && selectedSnippet ? selectedSnippet : undefined}
      />
    </div>
  );
}
