// components/snippets/SnippetDetail.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Star,
  Trash2,
  Pencil,
  X,
  Save,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/trpc";
import { LANGUAGES } from "./AddSnippetModal";
import { WorkspacePicker } from "@/components/tasks/WorkspacePicker";

interface SnippetDetailProps {
  snippetId: string | null; // null = create mode
  onCreated: (id: string) => void;
  onDelete: () => void;
  onDiscard: () => void;
}

export function SnippetDetail({
  snippetId,
  onCreated,
  onDelete,
  onDiscard,
}: SnippetDetailProps) {
  const isCreateMode = snippetId === null;

  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(isCreateMode);

  // Form state
  const [editTitle, setEditTitle] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editLanguage, setEditLanguage] = useState("typescript");
  const [editTags, setEditTags] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");

  const utils = api.useUtils();

  const { data: snippet, isLoading } = api.snippets.byId.useQuery(
    { id: snippetId! },
    { enabled: !!snippetId },
  );

  const { data: workspaces } = api.workspaces.list.useQuery();

  // Set default workspace for create mode
  useEffect(() => {
    if (!isCreateMode || workspaceId) return;
    if (!workspaces?.length) return;
    const def = workspaces.find((w) => w.isDefault) ?? workspaces[0];
    if (def) setWorkspaceId(def.id);
  }, [isCreateMode, workspaces, workspaceId]);

  // Sync from fetched snippet
  useEffect(() => {
    if (snippet) {
      setEditTitle(snippet.title);
      setEditCode(snippet.code);
      setEditLanguage(snippet.language);
      setEditTags(snippet.tags.join(", "));
      setWorkspaceId(snippet.workspaceId);
    }
  }, [snippet]);

  // Reset on snippet change
  useEffect(() => {
    if (!isCreateMode) {
      setIsEditing(false);
      setConfirmDelete(false);
    }
  }, [snippetId]);

  const toggleFavorite = api.snippets.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.snippets.list.invalidate();
      if (snippetId) utils.snippets.byId.invalidate({ id: snippetId });
    },
  });

  const incrementUsage = api.snippets.incrementUsage.useMutation();

  const createSnippet = api.snippets.create.useMutation({
    onSuccess: (data) => {
      utils.snippets.list.invalidate();
      onCreated(data.id);
    },
  });

  const updateSnippet = api.snippets.update.useMutation({
    onSuccess: () => {
      utils.snippets.list.invalidate();
      if (snippetId) utils.snippets.byId.invalidate({ id: snippetId });
      setIsEditing(false);
    },
  });

  const deleteSnippet = api.snippets.delete.useMutation({
    onSuccess: () => {
      utils.snippets.list.invalidate();
      onDelete();
    },
  });

  function handleCopy() {
    const code = isEditing ? editCode : snippet?.code;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    if (snippetId) incrementUsage.mutate({ id: snippetId });
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    if (!editTitle.trim() || !editCode.trim() || !workspaceId) return;

    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (isCreateMode) {
      createSnippet.mutate({
        title: editTitle.trim(),
        code: editCode,
        language: editLanguage,
        tags,
        workspaceId,
      });
    } else if (snippetId) {
      updateSnippet.mutate({
        id: snippetId,
        title: editTitle.trim(),
        code: editCode,
        language: editLanguage,
        tags,
      });
    }
  }

  function handleCancelEdit() {
    if (isCreateMode) {
      onDiscard();
      return;
    }
    if (snippet) {
      setEditTitle(snippet.title);
      setEditCode(snippet.code);
      setEditLanguage(snippet.language);
      setEditTags(snippet.tags.join(", "));
    }
    setIsEditing(false);
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancelEdit();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isEditing, editTitle, editCode, editLanguage, editTags, workspaceId, isCreateMode]);

  // Loading for existing snippet
  if (!isCreateMode && isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-2 w-full max-w-md px-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 animate-pulse rounded bg-surface-2"
              style={{ opacity: 1 - i * 0.2 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isCreateMode && !snippet) return null;

  const isPending = createSnippet.isPending || updateSnippet.isPending;
  const displayTitle = isEditing ? editTitle : snippet?.title ?? "";
  const displayCode = isEditing ? editCode : snippet?.code ?? "";
  const displayLanguage = isEditing ? editLanguage : snippet?.language ?? "typescript";

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-3 border-b border-border-subtle flex-shrink-0">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1 mr-4">
          {isEditing ? (
            <>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-transparent text-text-primary text-lg font-medium outline-none border-b border-border-subtle pb-1 focus:border-accent transition-colors"
                placeholder="Snippet title"
                autoFocus
              />
              <div className="flex items-center gap-3 mt-1">
                <select
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className="bg-surface-0 border border-border-default rounded px-1.5 py-0.5 text-[11px] text-text-secondary focus:outline-none focus:border-border-strong transition-colors"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                {/* Workspace — only in create mode */}
                {isCreateMode && (
                  <div className="w-[140px]">
                    <WorkspacePicker value={workspaceId} onChange={setWorkspaceId} />
                  </div>
                )}
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="tags (comma separated)"
                  className="flex-1 bg-transparent text-[11px] text-text-tertiary outline-none border-b border-border-subtle pb-0.5 focus:border-border-strong transition-colors placeholder:text-text-ghost"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-medium text-text-primary truncate">
                {snippet!.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-ghost bg-surface-2 px-1.5 py-0.5 rounded font-mono">
                  {snippet!.language}
                </span>
                {snippet!.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {snippet!.usageCount > 0 && (
                  <span className="text-[11px] text-text-ghost">
                    copied {snippet!.usageCount}×
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-2 py-1 text-[12px] text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={13} strokeWidth={1.5} />
                {isCreateMode ? "Discard" : "Cancel"}
              </button>
              <button
                onClick={handleSave}
                disabled={!editTitle.trim() || !editCode.trim() || !workspaceId || isPending}
                className="flex items-center gap-1 px-2.5 py-1 text-[12px] bg-accent text-white rounded font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <Save size={12} strokeWidth={1.5} />
                {isPending ? "Saving..." : isCreateMode ? "Save Snippet" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopy}
                title="Copy code"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] transition-all ${
                  copied
                    ? "bg-surface-3 text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                }`}
              >
                {copied ? (
                  <><Check size={13} strokeWidth={1.5} /> Copied!</>
                ) : (
                  <><Copy size={13} strokeWidth={1.5} /> Copy</>
                )}
              </button>

              <button
                onClick={() => toggleFavorite.mutate({ id: snippetId! })}
                title={snippet!.isFavorite ? "Unfavorite" : "Favorite"}
                className="p-1.5 rounded transition-colors text-text-tertiary hover:text-accent hover:bg-surface-2"
              >
                <Star
                  size={15}
                  strokeWidth={1.5}
                  className={snippet!.isFavorite ? "fill-accent text-accent" : ""}
                />
              </button>

              <button
                onClick={() => setIsEditing(true)}
                title="Edit inline"
                className="p-1.5 rounded transition-colors text-text-tertiary hover:text-text-primary hover:bg-surface-2"
              >
                <Pencil size={15} strokeWidth={1.5} />
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <span className="text-[12px] text-text-secondary">Delete?</span>
                  <button
                    onClick={() => deleteSnippet.mutate({ id: snippetId! })}
                    className="px-2 py-1 text-[12px] bg-red-500 text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 text-[12px] text-text-secondary hover:text-text-primary transition-colors"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="Delete"
                  className="p-1.5 rounded transition-colors text-text-tertiary hover:text-red-500 hover:bg-surface-2"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={displayLanguage === "docker" ? "dockerfile" : displayLanguage}
          value={displayCode}
          onChange={(v) => {
            if (isEditing) setEditCode(v ?? "");
          }}
          theme="vs-light"
          options={{
            readOnly: !isEditing,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily: "JetBrains Mono, monospace",
            padding: { top: 12, bottom: 12 },
            wordWrap: "on",
            renderLineHighlight: isEditing ? "line" : "none",
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
      {isEditing && (
        <div className="flex items-center justify-between px-6 py-2 border-t border-border-subtle bg-surface-1 flex-shrink-0">
          <span className="text-[11px] text-text-ghost">
            {isCreateMode ? "New snippet — fill in title and code, then save" : "Editing — changes are not saved until you press Save"}
          </span>
          <span className="text-[11px] text-text-ghost">
            <span className="kbd">⌘S</span> save · <span className="kbd">Esc</span> {isCreateMode ? "discard" : "cancel"}
          </span>
        </div>
      )}
    </div>
  );
}