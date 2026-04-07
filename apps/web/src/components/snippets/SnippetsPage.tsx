// components/snippets/SnippetsPage.tsx
"use client";

import { useState, useEffect } from "react";
import { SnippetList } from "./SnippetList";
import { SnippetDetail } from "./SnippetDetail";
import { AddSnippetModal } from "./AddSnippetModal";
import { ScratchpadList } from "./ScratchpadList";
import { ScratchpadDetail } from "./ScratchpadDetail";
import { AddScratchpadModal } from "./AddScratchpadModal";
import { PromoteModal } from "./PromoteModal";
import { api } from "@/lib/trpc";
import { Code2, FileText } from "lucide-react";

type Tab = "snippets" | "scratchpad";

export function SnippetsPage() {
  const [tab, setTab] = useState<Tab>("snippets");

  // ── Snippet state ─────────────────────────────────────────────────────────
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [isEditingSnippet, setIsEditingSnippet] = useState(false);
  const [snippetSearch, setSnippetSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");

  const { data: selectedSnippet } = api.snippets.byId.useQuery(
    { id: selectedSnippetId! },
    { enabled: !!selectedSnippetId },
  );

  // ── Scratchpad state ──────────────────────────────────────────────────────
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const [padModalOpen, setPadModalOpen] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);

  const { data: selectedPad } = api.scratchpads.byId.useQuery(
    { id: selectedPadId! },
    { enabled: !!selectedPadId },
  );

  // ── N shortcut ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        if (tab === "snippets") setSnippetModalOpen(true);
        else setPadModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab]);

  // ── Snippet handlers ──────────────────────────────────────────────────────
  function handleSnippetEdit() {
    setIsEditingSnippet(true);
  }

  function handleSnippetDelete() {
    setSelectedSnippetId(null);
    setIsEditingSnippet(false);
  }

  function handleSnippetModalClose() {
    setSnippetModalOpen(false);
    setIsEditingSnippet(false);
  }

  // ── Scratchpad handlers ───────────────────────────────────────────────────
  function handlePadDelete() {
    setSelectedPadId(null);
  }

  function handlePromote() {
    setPromoteModalOpen(true);
  }

  function handlePromoteClose() {
    setPromoteModalOpen(false);
  }

  function handlePromoteSuccess() {
    setPromoteModalOpen(false);
    setSelectedPadId(null);
    // Switch to snippets tab to show the new snippet
    setTab("snippets");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-end justify-between border-b border-border-subtle px-6 py-4 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[32px] leading-none text-text-primary normal-case">
            {tab === "snippets" ? "Snippets" : "Scratchpad"}
          </h1>
          <p className="text-[12px] text-text-tertiary tracking-wide">
            {tab === "snippets"
              ? "Save, search, and copy code blocks"
              : "Quick paste with auto-expiry — promote to keep"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab toggle */}
          <div className="flex items-center rounded border border-border-default overflow-hidden">
            <button
              onClick={() => setTab("snippets")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "snippets"
                  ? "bg-accent text-white"
                  : "bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              Snippets
            </button>
            <button
              onClick={() => setTab("scratchpad")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "scratchpad"
                  ? "bg-accent text-white"
                  : "bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              Scratchpad
            </button>
          </div>

          <button
            onClick={() =>
              tab === "snippets" ? setSnippetModalOpen(true) : setPadModalOpen(true)
            }
            className="px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
          >
            {tab === "snippets" ? "+ New Snippet" : "+ Quick Paste"}
          </button>
        </div>
      </div>

      {/* Body — split panel */}
      <div className="flex flex-1 overflow-hidden">
        {tab === "snippets" ? (
          <>
            <SnippetList
              selectedId={selectedSnippetId}
              onSelect={setSelectedSnippetId}
              search={snippetSearch}
              onSearchChange={setSnippetSearch}
              languageFilter={languageFilter}
              onLanguageChange={setLanguageFilter}
            />
            <div className="flex-1 overflow-hidden">
              {selectedSnippetId ? (
                <SnippetDetail
                  key={selectedSnippetId}
                  snippetId={selectedSnippetId}
                  onEdit={handleSnippetEdit}
                  onDelete={handleSnippetDelete}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <Code2 size={28} strokeWidth={1} className="text-text-ghost" />
                  <p className="text-[14px] text-text-secondary">
                    Select a snippet to view it.
                  </p>
                  <p className="text-[13px] text-text-ghost">
                    Press <kbd className="kbd">N</kbd> to create one.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <ScratchpadList
              selectedId={selectedPadId}
              onSelect={setSelectedPadId}
            />
            <div className="flex-1 overflow-hidden">
              {selectedPadId && selectedPad ? (
                <ScratchpadDetail
                  key={selectedPadId}
                  pad={selectedPad}
                  onDelete={handlePadDelete}
                  onPromote={handlePromote}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <FileText size={28} strokeWidth={1} className="text-text-ghost" />
                  <p className="text-[14px] text-text-secondary">
                    Select a scratchpad to view it.
                  </p>
                  <p className="text-[13px] text-text-ghost">
                    Press <kbd className="kbd">N</kbd> to quick paste.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Snippet modal */}
      <AddSnippetModal
        key={isEditingSnippet ? `edit-${selectedSnippetId}` : "new"}
        open={snippetModalOpen || isEditingSnippet}
        onClose={handleSnippetModalClose}
        snippet={isEditingSnippet && selectedSnippet ? selectedSnippet : undefined}
      />

      {/* Scratchpad modal */}
      <AddScratchpadModal
        open={padModalOpen}
        onClose={() => setPadModalOpen(false)}
      />

      {/* Promote modal */}
      {selectedPad && (
        <PromoteModal
          open={promoteModalOpen}
          onClose={handlePromoteClose}
          onSuccess={handlePromoteSuccess}
          pad={selectedPad}
        />
      )}
    </div>
  );
}