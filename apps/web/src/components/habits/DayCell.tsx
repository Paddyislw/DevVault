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
  dayLabel: string;
  dayNumber: number;
  status: DayStatus;
  isToday: boolean;
  note: string | null;
  onToggle: () => void;
  onSaveNote: (note: string) => void;
  pending?: boolean;
}

export function DayCell({
  dayLabel,
  dayNumber,
  status,
  isToday,
  note,
  onToggle,
  onSaveNote,
  pending,
}: DayCellProps) {
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
  const outlineToday = status === "today";

  function handleCellClick() {
    if (!interactive || pending) return;
    onToggle();
    if (!done) setEditing(true);
  }

  function handleSave() {
    onSaveNote(draft.trim());
    setEditing(false);
  }

  const cell = (
    <button
      type="button"
      onClick={handleCellClick}
      disabled={!interactive || pending}
      className={`group relative flex h-[68px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border transition-all duration-150 ${
        done
          ? "border-accent bg-accent text-accent-foreground"
          : outlineToday
            ? "border-accent border-dashed bg-surface-0 text-text-primary hover:bg-surface-2"
            : status === "missed"
              ? "border-border-default bg-surface-0 text-text-tertiary hover:border-border-strong"
              : "cursor-default border-border-subtle bg-surface-0 text-text-ghost opacity-60"
      } ${interactive && !pending ? "active:scale-[0.96]" : ""}`}
    >
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide ${
          done ? "text-accent-foreground" : "text-text-ghost"
        }`}
      >
        {dayLabel}
      </span>

      {done ? (
        <span className="flex h-5 w-5 animate-in zoom-in-50 items-center justify-center rounded-full duration-200">
          <Check size={15} strokeWidth={2.5} />
        </span>
      ) : (
        <span className="text-[13px] font-medium">{dayNumber}</span>
      )}

      {isToday && (
        <span
          className={`absolute -top-1.5 rounded-full px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-wide ${
            done ? "bg-accent-foreground text-accent" : "bg-accent text-accent-foreground"
          }`}
        >
          Today
        </span>
      )}

      {note && (
        <span
          className={`absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ${
            done ? "text-accent-foreground" : "text-text-ghost"
          }`}
        >
          <StickyNote size={9} strokeWidth={2} fill="currentColor" />
        </span>
      )}
    </button>
  );

  return (
    <div ref={wrapRef} className="relative flex-1">
      {note ? (
        <Tooltip open={editing ? false : undefined}>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[180px] text-center normal-case">
            {note}
          </TooltipContent>
        </Tooltip>
      ) : (
        cell
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) setEditing((v) => !v);
        }}
        tabIndex={-1}
        className={`mt-1 h-[13px] w-full text-center text-[9px] transition-opacity ${
          interactive && (note || done)
            ? "text-text-ghost opacity-0 hover:text-text-secondary focus:opacity-100 group-hover:opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        {note ? "edit note" : done ? "+ note" : ""}
      </button>

      {editing && (
        <div className="absolute left-1/2 top-full z-20 mt-1.5 w-52 -translate-x-1/2 animate-in fade-in-0 zoom-in-95 rounded-lg border border-border-default bg-surface-1 p-2.5 shadow-md duration-150">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What did you do? (optional)"
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
