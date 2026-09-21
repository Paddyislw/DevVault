// components/habits/HabitFormModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/trpc";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DAY_LABELS, type Habit } from "./lib";

interface HabitFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present -> edit mode. Absent -> create mode. */
  habit?: Habit | null;
}

export function HabitFormModal({ open, onClose, habit }: HabitFormModalProps) {
  const isEdit = !!habit;
  const [name, setName] = useState("");
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [carryForward, setCarryForward] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const create = api.habits.create.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      onClose();
    },
  });

  const update = api.habits.update.useMutation({
    onSuccess: () => {
      utils.habits.list.invalidate();
      onClose();
    },
  });

  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? "");
    setWeeklyTarget(habit?.weeklyTarget ?? 5);
    setPreferredDays(habit?.preferredDays ?? []);
    setCarryForward(habit?.carryForward ?? true);
    setTimeout(() => nameRef.current?.focus(), 50);
  }, [open, habit]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function toggleDay(i: number) {
    setPreferredDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || pending) return;

    if (isEdit) {
      update.mutate({
        id: habit!.id,
        name: name.trim(),
        weeklyTarget,
        preferredDays,
        carryForward,
      });
    } else {
      create.mutate({
        name: name.trim(),
        weeklyTarget,
        preferredDays,
        carryForward,
      });
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="pointer-events-auto w-full max-w-md rounded-lg border border-border-default bg-surface-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
            <h2 className="font-display text-base font-light normal-case text-text-primary">
              {isEdit ? "Edit Habit" : "New Habit"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-text-tertiary transition-colors hover:text-text-primary"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Habit name</span>
              <input
                ref={nameRef}
                type="text"
                placeholder="e.g. Go to gym"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="rounded border border-border-default bg-surface-0 px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-border-strong focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Target days per week</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWeeklyTarget(n)}
                    className={`h-8 flex-1 rounded text-sm font-medium transition-colors ${
                      weeklyTarget === n
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-0 text-text-secondary border border-border-default hover:border-border-strong"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-text-ghost">{weeklyTarget} day{weeklyTarget !== 1 ? "s" : ""} per week</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">
                Preferred days{" "}
                <span className="text-text-ghost normal-case tracking-normal font-normal">(optional)</span>
              </span>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`h-8 flex-1 rounded text-[11px] font-medium transition-colors ${
                      preferredDays.includes(i)
                        ? "bg-accent-muted text-accent border border-accent"
                        : "bg-surface-0 text-text-tertiary border border-border-default hover:border-border-strong"
                    }`}
                  >
                    {label[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-border-default bg-surface-0 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="carry-forward" className="text-[13px] font-medium text-text-primary">
                  Carry forward
                </Label>
                <span className="text-[11px] text-text-ghost">
                  Automatically continue this habit into next week
                </span>
              </div>
              <Switch id="carry-forward" checked={carryForward} onCheckedChange={setCarryForward} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-text-tertiary">
                <span className="kbd">Esc</span> to cancel
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || pending}
                  className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pending ? "Saving..." : isEdit ? "Save changes" : "Create habit"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
