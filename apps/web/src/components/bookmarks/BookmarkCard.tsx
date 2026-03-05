"use client";
import { useState } from "react";
import type { RouterOutputs } from "@/lib/trpc";
import { api } from "@/lib/trpc";
import { ExternalLink, Trash2, RefreshCw, AlertCircle } from "lucide-react";

type Bookmark = RouterOutputs["bookmarks"]["list"][number];

interface Props {
  bookmark: Bookmark;
}

export function BookmarkCard({ bookmark }: Props) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const utils = api.useUtils();

  const deleteBookmark = api.bookmarks.delete.useMutation({
    onSettled: () => utils.bookmarks.list.invalidate(),
  });

  const refreshMetadata = api.bookmarks.refreshMetadata.useMutation({
    onSettled: () => utils.bookmarks.list.invalidate(),
  });

  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname.replace("www.", "");
    } catch {
      return bookmark.url;
    }
  })();

  return (
    <div className="bg-surface-1 border border-border-default rounded-md p-3.5 flex flex-col gap-2.5 hover:border-border-strong transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {bookmark.favicon ? (
            <img
              src={bookmark.favicon}
              alt=""
              className="w-4 h-4 rounded flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-4 h-4 rounded bg-surface-2 flex-shrink-0" />
          )}
          <span className="text-[11px] text-text-ghost truncate">{domain}</span>
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => refreshMetadata.mutate({ id: bookmark.id })}
            disabled={refreshMetadata.isPending}
            className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors disabled:opacity-40"
            title="Refresh metadata"
          >
            <RefreshCw
              size={11}
              strokeWidth={1.5}
              className={refreshMetadata.isPending ? "animate-spin" : ""}
            />
          </button>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
          >
            <ExternalLink size={11} strokeWidth={1.5} />
          </a>
          <button
            onClick={() => {
              if (deleteConfirm) deleteBookmark.mutate({ id: bookmark.id });
              else setDeleteConfirm(true);
            }}
            onBlur={() => setDeleteConfirm(false)}
            className={`p-1 rounded transition-colors ${
              deleteConfirm
                ? "text-red-500"
                : "text-text-tertiary hover:text-red-500"
            }`}
          >
            <Trash2 size={11} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-0.5">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium text-text-primary hover:text-accent transition-colors line-clamp-2 leading-snug"
        >
          {bookmark.title || domain}
        </a>
        {bookmark.description && (
          <p className="text-[11px] text-text-ghost leading-relaxed line-clamp-2">
            {bookmark.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-border-subtle">
        <div className="flex gap-1 flex-wrap">
          {bookmark.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-text-ghost">
              #{tag}
            </span>
          ))}
        </div>
        {!bookmark.isAlive && (
          <div className="flex items-center gap-1">
            <AlertCircle size={10} strokeWidth={1.5} className="text-red-400" />
            <span className="text-[10px] text-red-400">Dead link</span>
          </div>
        )}
      </div>
    </div>
  );
}
