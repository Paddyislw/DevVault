// components/snippets/AddScratchpadModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/trpc";
import { LANGUAGES } from "./AddSnippetModal";
import { WorkspacePicker } from "@/components/tasks/WorkspacePicker";

const TTL_OPTIONS = [
  { label: "1 hour", ms: 3600000 },
  { label: "1 day", ms: 86400000 },
  { label: "1 week", ms: 604800000 },
  { label: "Forever", ms: 0 },
] as const;

interface AddScratchpadModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddScratchpadModal({ open, onClose }: AddScratchpadModalProps) {
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [ttlMs, setTtlMs] = useState(86400000); // default 1 day
  const [workspaceId, setWorkspaceId] = useState("");
  const utils = api.useUtils();

  const { data: workspaces } = api.workspaces.list.useQuery();

  // Set default workspace
  useEffect(() => {
    if (workspaceId || !workspaces?.length) return;
    const def = workspaces.find((w) => w.isDefault) ?? workspaces[0];
    if (def) setWorkspaceId(def.id);
  }, [workspaces, workspaceId]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setContent("");
      setLanguage("plaintext");
      setTtlMs(86400000);
    }
  }, [open]);

  const createPad = api.scratchpads.create.useMutation({
    onSuccess: () => {
      utils.scratchpads.list.invalidate();
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !workspaceId) return;
    if (createPad.isPending) return;

    const expiresAt =
      ttlMs === 0 ? null : new Date(Date.now() + ttlMs).toISOString();

    createPad.mutate({
      content: content.trim(),
      language,
      workspaceId,
      expiresAt,
    });
  }

  if (!open) return null;

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
            <h2 className="font-display font-light text-base text-text-primary normal-case">
              Quick Paste
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
            {/* Language + TTL + Workspace row */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Language</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Expires in</span>
                <select
                  value={ttlMs}
                  onChange={(e) => setTtlMs(Number(e.target.value))}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                >
                  {TTL_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.ms}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Workspace</span>
                <WorkspacePicker
                  value={workspaceId}
                  onChange={setWorkspaceId}
                />
              </div>
            </div>

            {/* Code editor */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Paste your code</span>
              <div className="rounded overflow-hidden border border-border-default">
                <Editor
                  height="300px"
                  language={language === "docker" ? "dockerfile" : language}
                  value={content}
                  onChange={(v) => setContent(v ?? "")}
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
                  disabled={!content.trim() || !workspaceId || createPad.isPending}
                  className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {createPad.isPending ? "Saving..." : "Save pad"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}