// components/reminders/RemindersPage.tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/page-header";
import { AddReminderModal } from "./AddReminderModal";
import {
  Bell,
  Clock,
  Repeat,
  Trash2,
  X,
  Plus,
  CheckCircle2,
} from "lucide-react";

type Filter = "upcoming" | "snoozed" | "delivered" | "all";
type Category = "PROFESSIONAL" | "PERSONAL" | "BILLING" | "INFRA" | "CUSTOM";

const FILTER_LABELS: Record<Filter, string> = {
  upcoming: "Upcoming",
  snoozed: "Snoozed",
  delivered: "Delivered",
  all: "All",
};

const CATEGORY_COLORS: Record<string, string> = {
  PROFESSIONAL: "bg-blue-100 text-blue-700",
  PERSONAL: "bg-emerald-100 text-emerald-700",
  BILLING: "bg-amber-100 text-amber-700",
  INFRA: "bg-purple-100 text-purple-700",
  CUSTOM: "bg-gray-100 text-gray-700",
};

function formatReminderDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (dateOnly.getTime() === today.getTime()) return `Today, ${time}`;
  if (dateOnly.getTime() === tomorrow.getTime()) return `Tomorrow, ${time}`;

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }) + `, ${time}`;
}

function isOverdue(remindAt: Date | string): boolean {
  return new Date(remindAt).getTime() < Date.now();
}

export function RemindersPage() {
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [categoryFilter, setCategoryFilter] = useState<Category | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const utils = api.useUtils();

  const { data: reminders = [], isLoading } = api.reminders.list.useQuery({
    filter,
    ...(categoryFilter ? { category: categoryFilter as Category } : {}),
  });

  const snooze = api.reminders.snooze.useMutation({
    onSuccess: () => {
      utils.reminders.list.invalidate();
      utils.reminders.upcomingCount.invalidate();
    },
  });

  const dismiss = api.reminders.dismiss.useMutation({
    onSuccess: () => {
      utils.reminders.list.invalidate();
      utils.reminders.upcomingCount.invalidate();
    },
  });

  const deleteReminder = api.reminders.delete.useMutation({
    onSuccess: () => {
      utils.reminders.list.invalidate();
      utils.reminders.upcomingCount.invalidate();
    },
  });

  function handleSnooze(id: string, minutes: number) {
    snooze.mutate({ id, minutes });
  }

  function handleDismiss(id: string) {
    dismiss.mutate({ id });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this reminder permanently?")) return;
    deleteReminder.mutate({ id });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Reminders"
        subtitle={`${reminders.length} reminder${reminders.length !== 1 ? "s" : ""}`}
      >
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} strokeWidth={1.5} />
          New Reminder
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-border-subtle flex-shrink-0">
        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                filter === f
                  ? "bg-surface-2 text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | "")}
          className="bg-surface-0 border border-border-default rounded px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-border-strong transition-colors"
        >
          <option value="">All categories</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="PERSONAL">Personal</option>
          <option value="BILLING">Billing</option>
          <option value="INFRA">Infrastructure</option>
          <option value="CUSTOM">Custom</option>
        </select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-text-ghost">
            Loading...
          </div>
        ) : reminders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bell size={24} strokeWidth={1} className="text-text-ghost mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No {filter} reminders.</p>
            <p className="text-xs text-text-ghost mt-1">
              Press the button above or use the bot: &quot;remind me to...&quot;
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {reminders.map((r) => {
              const overdue = r.status === "PENDING" && isOverdue(r.remindAt);

              return (
                <div
                  key={r.id}
                  className={`px-6 py-4 hover:bg-surface-1 transition-colors ${
                    overdue ? "bg-red-50/40" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-text-primary font-medium truncate">
                          {r.title}
                        </p>
                        {r.status === "DELIVERED" && (
                          <CheckCircle2
                            size={13}
                            strokeWidth={1.5}
                            className="text-text-ghost flex-shrink-0"
                          />
                        )}
                      </div>

                      {r.description && (
                        <p className="text-xs text-text-tertiary mb-1.5 truncate">
                          {r.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Time */}
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            overdue ? "text-danger font-medium" : "text-text-ghost"
                          }`}
                        >
                          <Clock size={11} strokeWidth={1.5} />
                          {overdue ? "Overdue · " : ""}
                          {formatReminderDate(r.remindAt)}
                        </span>

                        {/* Repeat */}
                        {r.repeatRule && (
                          <span className="flex items-center gap-1 text-xs text-text-ghost">
                            <Repeat size={11} strokeWidth={1.5} />
                            {r.repeatRule.charAt(0) + r.repeatRule.slice(1).toLowerCase()}
                          </span>
                        )}

                        {/* Category badge */}
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            CATEGORY_COLORS[r.category] ?? CATEGORY_COLORS.CUSTOM
                          }`}
                        >
                          {r.category}
                        </span>

                        {/* Priority */}
                        {r.priority && (
                          <span className="text-[10px] text-text-ghost">
                            {r.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right — actions */}
                    {r.status !== "DISMISSED" && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Snooze options — only for pending/snoozed */}
                        {(r.status === "PENDING" || r.status === "SNOOZED") && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleSnooze(r.id, 60)}
                              className="px-2 py-1 text-[10px] text-text-tertiary hover:text-text-primary hover:bg-surface-2 rounded transition-colors"
                              title="Snooze 1 hour"
                            >
                              1h
                            </button>
                            <button
                              onClick={() => handleSnooze(r.id, 1440)}
                              className="px-2 py-1 text-[10px] text-text-tertiary hover:text-text-primary hover:bg-surface-2 rounded transition-colors"
                              title="Snooze 1 day"
                            >
                              1d
                            </button>
                            <button
                              onClick={() => handleSnooze(r.id, 10080)}
                              className="px-2 py-1 text-[10px] text-text-tertiary hover:text-text-primary hover:bg-surface-2 rounded transition-colors"
                              title="Snooze 1 week"
                            >
                              1w
                            </button>
                          </div>
                        )}

                        {/* Dismiss */}
                        {r.status !== "DELIVERED" && (
                          <button
                            onClick={() => handleDismiss(r.id)}
                            className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors"
                            title="Dismiss"
                          >
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 text-text-tertiary hover:text-danger transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddReminderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}