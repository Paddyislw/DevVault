// components/snippets/AddSnippetModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/trpc";
import { WorkspacePicker } from "@/components/tasks/WorkspacePicker";
import type { RouterOutputs } from "@/lib/trpc";

type Snippet = RouterOutputs["snippets"]["list"][number];

export const LANGUAGES = [
  "plaintext",
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
  "python",
  "bash",
  "sql",
  "json",
  "css",
  "html",
  "go",
  "rust",
  "docker",
  "yaml",
  "markdown",
] as const;

interface AddSnippetModalProps {
  open: boolean;
  onClose: () => void;
  snippet?: Snippet;
}

interface FormState {
  title: string;
  code: string;
  language: string;
  tags: string; // comma-separated input → array on submit
  workspaceId: string;
}

function getInitialForm(snippet?: Snippet): FormState {
  if (snippet) {
    return {
      title: snippet.title,
      code: snippet.code,
      language: snippet.language,
      tags: snippet.tags.join(", "),
      workspaceId: snippet.workspaceId,
    };
  }
  return {
    title: "",
    code: "",
    language: "typescript",
    tags: "",
    workspaceId: "",
  };
}

export function AddSnippetModal({ open, onClose, snippet }: AddSnippetModalProps) {
  const [form, setForm] = useState<FormState>(() => getInitialForm(snippet));
  const titleRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const { data: workspaces } = api.workspaces.list.useQuery();

  // Set default workspace for create mode
  useEffect(() => {
    if (snippet || form.workspaceId) return;
    if (!workspaces?.length) return;
    const def = workspaces.find((w) => w.isDefault) ?? workspaces[0];
    if (def) setForm((f) => ({ ...f, workspaceId: def.id }));
  }, [snippet, workspaces, form.workspaceId]);

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const createSnippet = api.snippets.create.useMutation({
    onSuccess: () => {
      utils.snippets.list.invalidate();
      onClose();
    },
  });

  const updateSnippet = api.snippets.update.useMutation({
    onSuccess: () => {
      utils.snippets.list.invalidate();
      if (snippet) utils.snippets.byId.invalidate({ id: snippet.id });
      onClose();
    },
  });

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.code.trim() || !form.workspaceId) return;
    if (createSnippet.isPending || updateSnippet.isPending) return;

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (snippet) {
      updateSnippet.mutate({
        id: snippet.id,
        title: form.title.trim(),
        code: form.code,
        language: form.language,
        tags,
      });
    } else {
      createSnippet.mutate({
        title: form.title.trim(),
        code: form.code,
        language: form.language,
        tags,
        workspaceId: form.workspaceId,
      });
    }
  }

  if (!open) return null;

  const isPending = createSnippet.isPending || updateSnippet.isPending;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface-1 border border-border-default rounded-lg w-full max-w-2xl shadow-lg pointer-events-auto flex flex-col"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-shrink-0">
            <h2 className="font-display font-light text-base text-text-primary">
              {snippet ? "Edit Snippet" : "New Snippet"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="p-5 flex flex-col gap-4 overflow-y-auto"
          >
            {/* Title */}
            <input
              ref={titleRef}
              type="text"
              placeholder="Snippet title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-sm outline-none border-b border-border-subtle pb-2 focus:border-border-strong transition-colors"
            />

            {/* Language + Workspace row */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Language</span>
                <select
                  value={form.language}
                  onChange={(e) => set("language", e.target.value)}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Only show workspace picker in create mode */}
              {!snippet && (
                <div className="flex flex-col gap-1.5 flex-1">
                  <span className="label text-text-secondary">Workspace</span>
                  <WorkspacePicker
                    value={form.workspaceId}
                    onChange={(v) => set("workspaceId", v)}
                  />
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">
                Tags{" "}
                <span className="text-text-ghost normal-case tracking-normal font-normal">
                  (comma separated)
                </span>
              </span>
              <input
                type="text"
                placeholder="react, hooks, util"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {/* Code editor */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Code</span>
              <div className="rounded overflow-hidden border border-border-default">
                <Editor
                  height="260px"
                  language={form.language === "docker" ? "dockerfile" : form.language}
                  value={form.code}
                  onChange={(v) => set("code", v ?? "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    fontFamily: "JetBrains Mono, monospace",
                    padding: { top: 12, bottom: 12 },
                    wordWrap: "on",
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-text-tertiary">
                <span className="kbd">Esc</span> to cancel
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !form.title.trim() ||
                    !form.code.trim() ||
                    !form.workspaceId ||
                    isPending
                  }
                  className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {snippet
                    ? isPending
                      ? "Saving..."
                      : "Save changes"
                    : isPending
                      ? "Creating..."
                      : "Create snippet"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
