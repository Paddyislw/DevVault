// components/snippets/ScratchpadDetail.tsx
"use client";

import { useState } from "react";
import { Copy, Trash2, ArrowUpRight, Clock, Check } from "lucide-react";
import Editor from "@monaco-editor/react";
import { api } from "@/lib/trpc";
import type { RouterOutputs } from "@/lib/trpc";

type Scratchpad = RouterOutputs["scratchpads"]["byId"];

interface ScratchpadDetailProps {
  pad: Scratchpad;
  onDelete: () => void;
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

export function ScratchpadDetail({ pad, onDelete, onPromote }: ScratchpadDetailProps) {
  const [copied, setCopied] = useState(false);
  const utils = api.useUtils();

  const deleteMutation = api.scratchpads.delete.useMutation({
    onSuccess: () => {
      utils.scratchpads.list.invalidate();
      onDelete();
    },
  });

  async function handleCopy() {
    await navigator.clipboard.writeText(pad.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete() {
    if (!confirm("Delete this scratchpad?")) return;
    deleteMutation.mutate({ id: pad.id });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-ghost bg-surface-2 px-2 py-0.5 rounded">
            {pad.language}
          </span>
          <div className="flex items-center gap-1 text-text-ghost">
            <Clock size={12} strokeWidth={1.5} />
            <span className="text-xs">{timeRemaining(pad.expiresAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Promote to Snippet */}
          <button
            onClick={onPromote}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-accent hover:bg-surface-1 rounded transition-colors"
            title="Promote to snippet"
          >
            <ArrowUpRight size={13} strokeWidth={1.5} />
            Promote
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check size={15} strokeWidth={1.5} className="text-accent" />
            ) : (
              <Copy size={15} strokeWidth={1.5} />
            )}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-1.5 text-text-tertiary hover:text-danger transition-colors"
            title="Delete"
          >
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Monaco editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={pad.language === "docker" ? "dockerfile" : pad.language}
          value={pad.content}
          theme="vs-light"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily: "JetBrains Mono, monospace",
            padding: { top: 12, bottom: 12 },
            wordWrap: "on",
            renderLineHighlight: "none",
          }}
        />
      </div>
    </div>
  );
}