// components/snippets/ScratchpadList.tsx
"use client";

import { api } from "@/lib/trpc";
import { Clock, FileText } from "lucide-react";

interface ScratchpadListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Human-readable time remaining from an expiry date */
function timeRemaining(expiresAt: Date | string | null): string | null {
  if (!expiresAt) return "No expiry";

  const exp = new Date(expiresAt);
  const diff = exp.getTime() - Date.now();

  if (diff <= 0) return "Expired";

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;

  const days = Math.floor(hrs / 24);
  return `${days}d left`;
}

/** Color class for TTL badge based on urgency */
function ttlColor(expiresAt: Date | string | null): string {
  if (!expiresAt) return "text-text-ghost";

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "text-danger";
  if (diff < 3600000) return "text-danger"; // < 1hr
  if (diff < 86400000) return "text-text-tertiary"; // < 1day
  return "text-text-ghost";
}

export function ScratchpadList({ selectedId, onSelect }: ScratchpadListProps) {
  const { data: pads = [], isLoading } = api.scratchpads.list.useQuery({});

  return (
    <div className="w-[320px] flex-shrink-0 border-r border-border-subtle flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <p className="text-xs text-text-ghost">
          {pads.length} pad{pads.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-xs text-text-ghost">
            Loading...
          </div>
        ) : pads.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-secondary">No scratchpads yet.</p>
            <p className="text-xs text-text-ghost mt-1">
              Press <kbd className="kbd">N</kbd> to quick paste.
            </p>
          </div>
        ) : (
          pads.map((pad) => (
            <button
              key={pad.id}
              onClick={() => onSelect(pad.id)}
              className={`w-full text-left px-4 py-3 border-b border-border-subtle transition-colors ${
                selectedId === pad.id
                  ? "bg-surface-2"
                  : "hover:bg-surface-1"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* First line of content as "title" */}
                  <p className="text-sm text-text-primary truncate">
                    {pad.content.split("\n")[0].slice(0, 60) || "Empty pad"}
                  </p>
                  <p className="text-xs text-text-ghost mt-0.5 truncate">
                    {pad.content.split("\n").slice(1).join(" ").slice(0, 40) || "\u00A0"}
                  </p>
                </div>
                <span className="text-[10px] text-text-ghost flex-shrink-0">
                  {pad.language}
                </span>
              </div>

              {/* TTL badge */}
              <div className={`flex items-center gap-1 mt-1.5 ${ttlColor(pad.expiresAt)}`}>
                <Clock size={10} strokeWidth={1.5} />
                <span className="text-[10px]">
                  {timeRemaining(pad.expiresAt)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}