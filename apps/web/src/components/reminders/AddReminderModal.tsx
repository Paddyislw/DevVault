// components/reminders/AddReminderModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/trpc";

interface AddReminderModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddReminderModal({ open, onClose }: AddReminderModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [repeatRule, setRepeatRule] = useState<string>("");
  const [category, setCategory] = useState("PROFESSIONAL");
  const [priority, setPriority] = useState<string>("");
  const titleRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const create = api.reminders.create.useMutation({
    onSuccess: () => {
      utils.reminders.list.invalidate();
      utils.reminders.upcomingCount.invalidate();
      onClose();
    },
  });

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setRepeatRule("");
      setCategory("PROFESSIONAL");
      setPriority("");

      // Default to tomorrow 9am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split("T")[0]);
      setTime("09:00");

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
    if (!title.trim() || !date || !time) return;
    if (create.isPending) return;

    const remindAt = new Date(`${date}T${time}:00`).toISOString();

    create.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      remindAt,
      repeatRule: repeatRule ? (repeatRule as "DAILY" | "WEEKLY" | "MONTHLY") : null,
      category: category as "PROFESSIONAL" | "PERSONAL" | "BILLING" | "INFRA" | "CUSTOM",
      priority: priority ? (priority as "P1" | "P2" | "P3" | "P4") : null,
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
            <h2 className="font-display font-light text-base text-text-primary normal-case">
              New Reminder
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
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">What to remember</span>
              <input
                ref={titleRef}
                type="text"
                placeholder="e.g. Renew .dev domain"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {/* Description (optional) */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">
                Notes{" "}
                <span className="text-text-ghost normal-case tracking-normal font-normal">
                  (optional)
                </span>
              </span>
              <input
                type="text"
                placeholder="Additional context"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {/* Date + Time row */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Time</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                />
              </div>
            </div>

            {/* Recurrence + Category row */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Repeat</span>
                <select
                  value={repeatRule}
                  onChange={(e) => setRepeatRule(e.target.value)}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                >
                  <option value="">One-time</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                >
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="BILLING">Billing</option>
                  <option value="INFRA">Infrastructure</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>

            {/* Priority (optional) */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">
                Priority{" "}
                <span className="text-text-ghost normal-case tracking-normal font-normal">
                  (optional)
                </span>
              </span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
              >
                <option value="">None</option>
                <option value="P1">P1 — Critical</option>
                <option value="P2">P2 — High</option>
                <option value="P3">P3 — Normal</option>
                <option value="P4">P4 — Low</option>
              </select>
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
                  disabled={!title.trim() || !date || !time || create.isPending}
                  className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {create.isPending ? "Creating..." : "Create reminder"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}