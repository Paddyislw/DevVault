// components/habits/DayCell.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, StickyNote } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DayStatus } from "./lib";

interface DayCellProps {
  status: DayStatus;
  note: string | null;
  onToggle: () => void;
  onSaveNote: (note: string) => void;
  pending?: boolean;
}

/** Compact square day cell used in the habit grid — click toggles completion;
 * the note editor is a secondary action tucked behind a small hover icon so
 * it never competes with the primary click-to-complete interaction. */
export function DayCell({ status, note, onToggle, onSaveNote, pending }: DayCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) setDraft(note ?? "");
  }, [editing, note]);

  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing]);

  const interactive = status !== "upcoming";
  const done = status === "completed";
  const isToday = status === "today";

  function handleSave() {
    onSaveNote(draft.trim());
    setEditing(false);
  }

  const cell = (
    <button
      type="button"
      onClick={() => interactive && !pending && onToggle()}
      disabled={!interactive || pending}
      className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border transition-colors duration-150 ${
        done
          ? "border-accent bg-accent text-accent-foreground"
          : isToday
            ? "border-accent border-dashed bg-surface-0 text-text-tertiary hover:bg-surface-2"
            : status === "missed"
              ? "border-border-default bg-surface-0 text-text-tertiary hover:border-border-strong"
              : "cursor-default border-border-subtle bg-surface-0 text-text-ghost opacity-50"
      } ${interactive && !pending ? "active:scale-90" : ""}`}
    >
      {done ? (
        <Check size={13} strokeWidth={2.5} className="animate-in zoom-in-50 duration-150" />
      ) : (
        <span className="h-1 w-1 rounded-full bg-current" />
      )}

      {note && (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full ${
            done ? "text-accent-foreground" : "text-text-ghost"
          }`}
        >
          <StickyNote size={7} strokeWidth={2} fill="currentColor" />
        </span>
      )}
    </button>
  );

  return (
    <div ref={wrapRef} className="group relative flex flex-col items-center">
      {note && !editing ? (
        <Tooltip open={editing ? false : undefined}>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[180px] text-center normal-case">
            {note}
          </TooltipContent>
        </Tooltip>
      ) : (
        cell
      )}

      {interactive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditing((v) => !v);
          }}
          title={note ? "Edit note" : "Add note"}
          className="absolute -bottom-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100"
          tabIndex={-1}
        >
          <StickyNote size={9} strokeWidth={2} className="text-text-ghost hover:text-text-secondary" />
        </button>
      )}

      {editing && (
        <div className="absolute left-1/2 top-full z-20 mt-2 w-48 -translate-x-1/2 animate-in fade-in-0 zoom-in-95 rounded-lg border border-border-default bg-surface-1 p-2.5 shadow-md duration-150">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Optional note..."
            rows={2}
            maxLength={200}
            className="w-full resize-none rounded-md border border-border-default bg-surface-0 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-ghost focus:border-accent focus:outline-none"
          />
          <div className="mt-1.5 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded px-2 py-1 text-[11px] text-text-tertiary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-accent px-2 py-1 text-[11px] font-medium text-accent-foreground hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
