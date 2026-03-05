// components/snippets/SnippetDetail.tsx
"use client";

import { useState } from "react";
import { Copy, Check, Star, Pencil, Trash2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/trpc";

interface SnippetDetailProps {
  snippetId: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function SnippetDetail({ snippetId, onEdit, onDelete }: SnippetDetailProps) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const utils = api.useUtils();

  const { data: snippet, isLoading } = api.snippets.byId.useQuery({
    id: snippetId,
  });

  const toggleFavorite = api.snippets.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.snippets.list.invalidate();
      utils.snippets.byId.invalidate({ id: snippetId });
    },
  });

  const incrementUsage = api.snippets.incrementUsage.useMutation();

  const deleteSnippet = api.snippets.delete.useMutation({
    onSuccess: () => {
      utils.snippets.list.invalidate();
      onDelete();
    },
  });

  function handleCopy() {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    incrementUsage.mutate({ id: snippetId });
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
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

  if (!snippet) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Detail header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="font-display text-[22px] leading-tight text-text-primary truncate">
            {snippet.title}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-ghost bg-surface-2 px-1.5 py-0.5 rounded font-mono">
              {snippet.language}
            </span>
            {snippet.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {snippet.usageCount > 0 && (
              <span className="text-[11px] text-text-ghost">
                copied {snippet.usageCount}×
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Copy */}
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
              <>
                <Check size={13} strokeWidth={1.5} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={13} strokeWidth={1.5} />
                Copy
              </>
            )}
          </button>

          {/* Favorite */}
          <button
            onClick={() => toggleFavorite.mutate({ id: snippetId })}
            title={snippet.isFavorite ? "Remove from favorites" : "Add to favorites"}
            className="p-1.5 rounded transition-colors text-text-tertiary hover:text-accent hover:bg-surface-2"
          >
            <Star
              size={15}
              strokeWidth={1.5}
              className={snippet.isFavorite ? "fill-accent text-accent" : ""}
            />
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            title="Edit snippet"
            className="p-1.5 rounded transition-colors text-text-tertiary hover:text-text-primary hover:bg-surface-2"
          >
            <Pencil size={15} strokeWidth={1.5} />
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-[12px] text-text-secondary">Delete?</span>
              <button
                onClick={() => deleteSnippet.mutate({ id: snippetId })}
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
              title="Delete snippet"
              className="p-1.5 rounded transition-colors text-text-tertiary hover:text-red-500 hover:bg-surface-2"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Monaco editor — read only */}
      <div className="flex-1 overflow-hidden h-full p-2">
        <Editor
          height="100%"
          language={snippet.language === "docker" ? "dockerfile" : snippet.language}
          value={snippet.code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily: "JetBrains Mono, monospace",
            padding: { top: 16, bottom: 16 },
            wordWrap: "on",
            renderLineHighlight: "none",
            cursorStyle: "line",
          }}
        />
      </div>
    </div>
  );
}
