// components/snippets/ScratchpadDetail.tsx
"use client";

import { useState, useEffect } from "react";
import { Copy, Trash2, ArrowUpRight, Clock, Check, Save, X } from "lucide-react";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/trpc";
import { LANGUAGES } from "./AddSnippetModal";
import { WorkspacePicker } from "@/components/tasks/WorkspacePicker";
import type { RouterOutputs } from "@/lib/trpc";

type Scratchpad = RouterOutputs["scratchpads"]["byId"];

const TTL_OPTIONS = [
  { label: "1 hour", ms: 3600000 },
  { label: "1 day", ms: 86400000 },
  { label: "1 week", ms: 604800000 },
  { label: "Forever", ms: 0 },
] as const;

interface ScratchpadDetailProps {
  pad: Scratchpad | null; // null = create mode
  onCreated: (id: string) => void;
  onDelete: () => void;
  onDiscard: () => void;
  onPromote: () => void;
}

function timeRemaining(expiresAt: Date | string | null): string {
  if (!expiresAt) return "No expiry";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m remaining`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h remaining`;
  const days = Math.floor(hrs / 24);
  return `${days}d remaining`;
}

export function ScratchpadDetail({
  pad,
  onCreated,
  onDelete,
  onDiscard,
  onPromote,
}: ScratchpadDetailProps) {
  const isCreateMode = pad === null;

  const [content, setContent] = useState(pad?.content ?? "");
  const [language, setLanguage] = useState(pad?.language ?? "plaintext");
  const [workspaceId, setWorkspaceId] = useState("");
  const [ttlMs, setTtlMs] = useState(86400000);
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const utils = api.useUtils();

  const { data: workspaces } = api.workspaces.list.useQuery();

  // Set default workspace for create
  useEffect(() => {
    if (!isCreateMode || workspaceId) return;
    if (!workspaces?.length) return;
    const def = workspaces.find((w) => w.isDefault) ?? workspaces[0];
    if (def) setWorkspaceId(def.id);
  }, [isCreateMode, workspaces, workspaceId]);

  // Sync from pad
  useEffect(() => {
    if (pad) {
      setContent(pad.content);
      setLanguage(pad.language);
      setIsDirty(false);
    } else {
      setContent("");
      setLanguage("plaintext");
      setIsDirty(false);
    }
  }, [pad?.id]);

  const createPad = api.scratchpads.create.useMutation({
    onSuccess: (data) => {
      utils.scratchpads.list.invalidate();
      onCreated(data.id);
    },
  });

  const updateMutation = api.scratchpads.update.useMutation({
    onSuccess: () => {
      utils.scratchpads.list.invalidate();
      if (pad) utils.scratchpads.byId.invalidate({ id: pad.id });
      setIsDirty(false);
    },
  });

  const deleteMutation = api.scratchpads.delete.useMutation({
    onSuccess: () => {
      utils.scratchpads.list.invalidate();
      onDelete();
    },
  });

  function handleContentChange(v: string | undefined) {
    setContent(v ?? "");
    if (!isCreateMode) setIsDirty(true);
  }

  function handleSave() {
    if (isCreateMode) {
      if (!content.trim() || !workspaceId) return;
      const expiresAt = ttlMs === 0 ? null : new Date(Date.now() + ttlMs).toISOString();
      createPad.mutate({ content: content.trim(), language, workspaceId, expiresAt });
    } else if (pad) {
      updateMutation.mutate({ id: pad.id, content, language });
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete() {
    if (!pad) return;
    if (!confirm("Delete this scratchpad?")) return;
    deleteMutation.mutate({ id: pad.id });
  }

  // Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && isCreateMode) {
        e.preventDefault();
        onDiscard();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content, language, workspaceId, ttlMs, isCreateMode, isDirty]);

  const isPending = createPad.isPending || updateMutation.isPending;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              if (!isCreateMode) setIsDirty(true);
            }}
            className="bg-surface-0 border border-border-default rounded px-1.5 py-0.5 text-[11px] text-text-secondary focus:outline-none focus:border-border-strong transition-colors"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Create mode: workspace + TTL */}
          {isCreateMode && (
            <>
              <div className="w-[130px]">
                <WorkspacePicker value={workspaceId} onChange={setWorkspaceId} />
              </div>
              <select
                value={ttlMs}
                onChange={(e) => setTtlMs(Number(e.target.value))}
                className="bg-surface-0 border border-border-default rounded px-1.5 py-0.5 text-[11px] text-text-secondary focus:outline-none focus:border-border-strong transition-colors"
              >
                {TTL_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.ms}>{opt.label}</option>
                ))}
              </select>
            </>
          )}

          {/* View mode: TTL display */}
          {!isCreateMode && pad && (
            <div className="flex items-center gap-1 text-text-ghost">
              <Clock size={12} strokeWidth={1.5} />
              <span className="text-xs">{timeRemaining(pad.expiresAt)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Discard — create mode */}
          {isCreateMode && (
            <button
              onClick={onDiscard}
              className="flex items-center gap-1 px-2 py-1 text-[12px] text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={13} strokeWidth={1.5} />
              Discard
            </button>
          )}

          {/* Save */}
          {(isCreateMode || isDirty) && (
            <button
              onClick={handleSave}
              disabled={isCreateMode ? (!content.trim() || !workspaceId || isPending) : isPending}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] bg-accent text-white rounded font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Save size={12} strokeWidth={1.5} />
              {isPending ? "Saving..." : isCreateMode ? "Save Pad" : "Save"}
            </button>
          )}

          {/* Promote — view mode only */}
          {!isCreateMode && (
            <button
              onClick={onPromote}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-accent hover:bg-surface-1 rounded transition-colors"
              title="Promote to snippet"
            >
              <ArrowUpRight size={13} strokeWidth={1.5} />
              Promote
            </button>
          )}

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check size={15} strokeWidth={1.5} className="text-accent" />
            ) : (
              <Copy size={15} strokeWidth={1.5} />
            )}
          </button>

          {/* Delete — view mode only */}
          {!isCreateMode && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-text-tertiary hover:text-danger transition-colors"
              title="Delete"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Editor — always editable */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language === "docker" ? "dockerfile" : language}
          value={content}
          onChange={handleContentChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily: "JetBrains Mono, monospace",
            padding: { top: 12, bottom: 12 },
            wordWrap: "on",
            renderLineHighlight: "line",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-border-subtle bg-surface-1 flex-shrink-0">
        <span className="text-[11px] text-text-ghost">
          {isCreateMode
            ? "New scratchpad — paste code and save"
            : isDirty
              ? "Unsaved changes"
              : "Ready"}
        </span>
        <span className="text-[11px] text-text-ghost">
          <span className="kbd">⌘S</span> save
          {isCreateMode && <> · <span className="kbd">Esc</span> discard</>}
        </span>
      </div>
    </div>
  );
}