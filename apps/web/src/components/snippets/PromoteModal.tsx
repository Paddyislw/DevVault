// components/snippets/PromoteModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/trpc";
import type { RouterOutputs } from "@/lib/trpc";

type Scratchpad = RouterOutputs["scratchpads"]["byId"];

interface PromoteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pad: Scratchpad;
}

export function PromoteModal({ open, onClose, onSuccess, pad }: PromoteModalProps) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const promote = api.scratchpads.promote.useMutation({
    onSuccess: () => {
      utils.scratchpads.list.invalidate();
      utils.snippets.list.invalidate();
      onSuccess();
    },
  });

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setTitle("");
      setTags("");
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || promote.isPending) return;

    promote.mutate({
      id: pad.id,
      title: title.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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
          className="bg-surface-1 border border-border-default rounded-lg w-full max-w-md shadow-lg pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={16} strokeWidth={1.5} className="text-accent" />
              <h2 className="font-display font-light text-base text-text-primary normal-case">
                Promote to Snippet
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Preview */}
            <div className="bg-surface-0 border border-border-default rounded p-3">
              <p className="text-xs text-text-ghost mb-1">
                {pad.language} · {pad.content.split("\n").length} lines
              </p>
              <pre className="text-xs text-text-secondary font-mono truncate">
                {pad.content.split("\n")[0]}
              </pre>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Snippet title</span>
              <input
                ref={titleRef}
                type="text"
                placeholder="e.g. useFetch hook, Docker cleanup script"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">
                Tags{" "}
                <span className="text-text-ghost normal-case tracking-normal font-normal">
                  (comma separated, optional)
                </span>
              </span>
              <input
                type="text"
                placeholder="react, hooks, util"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
              />
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
                  disabled={!title.trim() || promote.isPending}
                  className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {promote.isPending ? "Promoting..." : "Promote"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}