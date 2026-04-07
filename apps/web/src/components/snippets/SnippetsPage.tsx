// components/snippets/SnippetsPage.tsx
"use client";

import { useState, useEffect } from "react";
import { SnippetList } from "./SnippetList";
import { SnippetDetail } from "./SnippetDetail";
import { ScratchpadList } from "./ScratchpadList";
import { ScratchpadDetail } from "./ScratchpadDetail";
import { PromoteModal } from "./PromoteModal";
import { api } from "@/lib/trpc";
import { Code2, FileText } from "lucide-react";

type Tab = "snippets" | "scratchpad";

export function SnippetsPage() {
  const [tab, setTab] = useState<Tab>("snippets");

  // ── Snippet state ─────────────────────────────────────────────────────────
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [isCreatingSnippet, setIsCreatingSnippet] = useState(false);
  const [snippetSearch, setSnippetSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");

  // ── Scratchpad state ──────────────────────────────────────────────────────
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const [isCreatingPad, setIsCreatingPad] = useState(false);
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
        handleNew();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab]);

  function handleNew() {
    if (tab === "snippets") {
      setSelectedSnippetId(null);
      setIsCreatingSnippet(true);
    } else {
      setSelectedPadId(null);
      setIsCreatingPad(true);
    }
  }

  // ── Snippet handlers ──────────────────────────────────────────────────────
  function handleSnippetSelect(id: string) {
    setSelectedSnippetId(id);
    setIsCreatingSnippet(false);
  }

  function handleSnippetCreated(id: string) {
    setIsCreatingSnippet(false);
    setSelectedSnippetId(id);
  }

  function handleSnippetDelete() {
    setSelectedSnippetId(null);
    setIsCreatingSnippet(false);
  }

  // ── Scratchpad handlers ───────────────────────────────────────────────────
  function handlePadSelect(id: string) {
    setSelectedPadId(id);
    setIsCreatingPad(false);
  }

  function handlePadCreated(id: string) {
    setIsCreatingPad(false);
    setSelectedPadId(id);
  }

  function handlePadDelete() {
    setSelectedPadId(null);
    setIsCreatingPad(false);
  }

  function handlePromoteSuccess() {
    setPromoteModalOpen(false);
    setSelectedPadId(null);
    setTab("snippets");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex items-end justify-between border-b border-border-subtle px-6 py-4 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTab("snippets")}
              className={`relative font-display text-[32px] leading-none transition-colors normal-case ${
                tab === "snippets"
                  ? "text-text-primary"
                  : "text-text-ghost hover:text-text-tertiary"
              }`}
            >
              Snippets
              {tab === "snippets" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-accent rounded-full" />
              )}
            </button>
            <button
              onClick={() => setTab("scratchpad")}
              className={`relative font-display text-[32px] leading-none transition-colors normal-case ${
                tab === "scratchpad"
                  ? "text-text-primary"
                  : "text-text-ghost hover:text-text-tertiary"
              }`}
            >
              Scratchpad
              {tab === "scratchpad" && (
                <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-accent rounded-full" />
              )}
            </button>
          </div>
          <p className="text-[12px] text-text-tertiary tracking-wide">
            {tab === "snippets"
              ? "Save, search, and copy code blocks"
              : "Quick paste with auto-expiry — promote to keep"}
          </p>
        </div>

        <button
          onClick={handleNew}
          className="px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          {tab === "snippets" ? "+ New Snippet" : "+ Quick Paste"}
        </button>
      </div>

      {/* Body — split panel */}
      <div className="flex flex-1 overflow-hidden">
        {tab === "snippets" ? (
          <>
            <SnippetList
              selectedId={isCreatingSnippet ? null : selectedSnippetId}
              onSelect={handleSnippetSelect}
              search={snippetSearch}
              onSearchChange={setSnippetSearch}
              languageFilter={languageFilter}
              onLanguageChange={setLanguageFilter}
            />
            <div className="flex-1 overflow-hidden">
              {isCreatingSnippet ? (
                <SnippetDetail
                  key="new"
                  snippetId={null}
                  onCreated={handleSnippetCreated}
                  onDelete={handleSnippetDelete}
                  onDiscard={() => setIsCreatingSnippet(false)}
                />
              ) : selectedSnippetId ? (
                <SnippetDetail
                  key={selectedSnippetId}
                  snippetId={selectedSnippetId}
                  onCreated={() => {}}
                  onDelete={handleSnippetDelete}
                  onDiscard={() => {}}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <Code2 size={28} strokeWidth={1} className="text-text-ghost" />
                  <p className="text-[14px] text-text-secondary">
                    Select a snippet to view or edit it.
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
              selectedId={isCreatingPad ? null : selectedPadId}
              onSelect={handlePadSelect}
            />
            <div className="flex-1 overflow-hidden">
              {isCreatingPad ? (
                <ScratchpadDetail
                  key="new"
                  pad={null}
                  onCreated={handlePadCreated}
                  onDelete={handlePadDelete}
                  onDiscard={() => setIsCreatingPad(false)}
                  onPromote={() => {}}
                />
              ) : selectedPadId && selectedPad ? (
                <ScratchpadDetail
                  key={selectedPadId}
                  pad={selectedPad}
                  onCreated={() => {}}
                  onDelete={handlePadDelete}
                  onDiscard={() => {}}
                  onPromote={() => setPromoteModalOpen(true)}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <FileText size={28} strokeWidth={1} className="text-text-ghost" />
                  <p className="text-[14px] text-text-secondary">
                    Select a scratchpad to view or edit it.
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

      {/* Promote modal — only modal left */}
      {selectedPad && (
        <PromoteModal
          open={promoteModalOpen}
          onClose={() => setPromoteModalOpen(false)}
          onSuccess={handlePromoteSuccess}
          pad={selectedPad}
        />
      )}
    </div>
  );
}