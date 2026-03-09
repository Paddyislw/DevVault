"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  User,
  Briefcase,
} from "lucide-react";
import { api } from "@/lib/trpc";
import type { RouterOutputs } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/page-header";

type Workspace = RouterOutputs["workspaces"]["list"][number];

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#C25E4A",
  "#4A7FC2",
  "#4AC27F",
  "#C2A44A",
  "#7F4AC2",
  "#C24A7F",
  "#4AC2C2",
  "#6B7280",
];

const PRESET_ICONS = [
  "📁",
  "💼",
  "🏠",
  "🚀",
  "⚡",
  "🔧",
  "🎯",
  "📦",
  "🌱",
  "🔬",
  "🎨",
  "📝",
];

const TYPE_LABELS: Record<string, string> = {
  PERSONAL: "Personal",
  WORK: "Work",
  CUSTOM: "Custom",
};

/**
 * Default workspaces created on signup store Lucide icon names ("user", "briefcase").
 * Render those as actual Lucide components; everything else as emoji text.
 */
function WorkspaceIcon({
  icon,
  color,
  size = "md",
}: {
  icon: string | null;
  color: string | null;
  size?: "sm" | "md";
}) {
  const bg = (color ?? "#8C8C8C") + "20";
  const border = color ?? "#8C8C8C";
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const iconSize = size === "sm" ? 13 : 15;

  const isLucideName = icon === "user" || icon === "briefcase" || !icon;

  return (
    <div
      className={`${dim} rounded-md flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: bg, border: `1.5px solid ${border}` }}
    >
      {isLucideName ? (
        icon === "briefcase" ? (
          <Briefcase
            size={iconSize}
            strokeWidth={1.5}
            style={{ color: border }}
          />
        ) : (
          <User size={iconSize} strokeWidth={1.5} style={{ color: border }} />
        )
      ) : (
        <span className="leading-none">{icon}</span>
      )}
    </div>
  );
}

// ─── Workspace Modal ──────────────────────────────────────────────────────────

function WorkspaceModal({
  workspace,
  onClose,
  onSaved,
}: {
  workspace?: Workspace;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!workspace;

  const [name, setName] = useState(workspace?.name ?? "");
  const [color, setColor] = useState(workspace?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(
    // If stored icon is a Lucide name, start with a real emoji
    workspace?.icon && !["user", "briefcase"].includes(workspace.icon)
      ? workspace.icon
      : "📁",
  );
  const [type, setType] = useState<"PERSONAL" | "WORK" | "CUSTOM">(
    (workspace?.type as "PERSONAL" | "WORK" | "CUSTOM") ?? "CUSTOM",
  );
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();

  const create = api.workspaces.create.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      onSaved();
    },
    onError: (e) => setError(e.message),
  });

  const update = api.workspaces.update.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      onSaved();
    },
    onError: (e) => setError(e.message),
  });

  const isPending = create.isPending || update.isPending;

  function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (isEdit) {
      update.mutate({ id: workspace.id, name: name.trim(), color, icon, type });
    } else {
      create.mutate({ name: name.trim(), color, icon, type });
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-1 border border-border-default rounded-lg w-full max-w-[420px] shadow-xl pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h2 className="font-display text-[15px] font-light tracking-wide text-text-primary">
              {isEdit ? "Edit Workspace" : "New Workspace"}
            </h2>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors p-0.5 rounded hover:bg-surface-2"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Preview bar */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-0 border border-border-subtle rounded-md">
              <WorkspaceIcon icon={icon} color={color} size="sm" />
              <span className="text-sm text-text-primary flex-1 truncate">
                {name || (
                  <span className="text-text-ghost">Workspace name</span>
                )}
              </span>
              <span className="text-[11px] text-text-tertiary tracking-wide uppercase">
                {TYPE_LABELS[type]}
              </span>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="label">Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="e.g. Side Projects"
                maxLength={50}
                className="bg-surface-0 border border-border-default rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <label className="label">Type</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["PERSONAL", "WORK", "CUSTOM"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`py-1.5 text-xs rounded-md border transition-colors ${
                      type === t
                        ? "border-accent text-accent bg-accent-subtle font-medium"
                        : "border-border-default text-text-secondary hover:border-border-strong hover:bg-surface-2"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="flex flex-col gap-1.5">
              <label className="label">Color</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-6 h-6 rounded-full transition-all hover:scale-110 flex items-center justify-center flex-shrink-0 ring-offset-1"
                      style={{
                        backgroundColor: c,
                        boxShadow:
                          color === c
                            ? `0 0 0 2px white, 0 0 0 3.5px ${c}`
                            : "none",
                      }}
                    >
                      {color === c && (
                        <Check
                          size={11}
                          strokeWidth={3}
                          className="text-white"
                        />
                      )}
                    </button>
                  ))}
                </div>
                {/* Hex input */}
                <div className="flex items-center gap-1.5 border border-border-default rounded-md px-2 py-1 bg-surface-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-[72px] bg-transparent text-xs text-text-primary font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Icon */}
            <div className="flex flex-col gap-1.5">
              <label className="label">Icon</label>
              <div className="grid grid-cols-6 gap-1">
                {PRESET_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setIcon(emoji)}
                    className={`h-9 rounded-md text-base flex items-center justify-center transition-all ${
                      icon === emoji
                        ? "bg-surface-3 ring-1 ring-border-strong"
                        : "hover:bg-surface-2"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                <AlertTriangle
                  size={12}
                  strokeWidth={1.5}
                  className="flex-shrink-0"
                />
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !name.trim()}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Workspace"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  workspace,
  onClose,
}: {
  workspace: Workspace;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const [error, setError] = useState<string | null>(null);

  const del = api.workspaces.delete.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      onClose();
    },
    onError: (e) => setError(e.message),
  });

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-1 border border-border-default rounded-lg w-full max-w-sm shadow-xl pointer-events-auto p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trash2 size={14} strokeWidth={1.5} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Delete &quot;{workspace.name}&quot;?
              </p>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                This cannot be undone. Move or delete all tasks inside first.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              <AlertTriangle
                size={12}
                strokeWidth={1.5}
                className="flex-shrink-0"
              />
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => del.mutate({ id: workspace.id })}
              disabled={del.isPending}
              className="px-4 py-1.5 text-sm bg-red-500 text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {del.isPending ? "Deleting..." : "Delete Workspace"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Workspace Row ────────────────────────────────────────────────────────────

function WorkspaceRow({
  workspace,
  onEdit,
  onDelete,
}: {
  workspace: Workspace;
  onEdit: (ws: Workspace) => void;
  onDelete: (ws: Workspace) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2 transition-colors group rounded-md">
      <WorkspaceIcon
        icon={workspace.icon ?? null}
        color={workspace.color ?? null}
        size="sm"
      />

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-sm text-text-primary font-medium leading-tight truncate">
          {workspace.name}
        </span>
        <span className="text-[11px] text-text-tertiary leading-tight">
          {TYPE_LABELS[workspace.type]}
          {workspace.isDefault && " · Default"}
        </span>
      </div>

      {/* Color chip */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: workspace.color ?? "#8C8C8C" }}
      />

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(workspace)}
          className="p-1.5 rounded-md hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <Pencil size={12} strokeWidth={1.5} />
        </button>
        {!workspace.isDefault && (
          <button
            onClick={() => onDelete(workspace)}
            className="p-1.5 rounded-md hover:bg-red-50 text-text-tertiary hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: workspaces, isLoading } = api.workspaces.list.useQuery();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);

  function handleEdit(ws: Workspace) {
    setEditTarget(ws);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditTarget(null);
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Settings"
        subtitle="Manage your workspaces and preferences"
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-lg flex flex-col gap-8">
          {/* Section header */}
          <section className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[13px] font-medium text-text-primary">
                  Workspaces
                </h2>
                <p className="text-[12px] text-text-tertiary mt-0.5 leading-relaxed">
                  Organize work across isolated spaces. Default workspaces
                  cannot be deleted.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditTarget(null);
                  setModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded-md font-medium hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <Plus size={13} strokeWidth={2} />
                New
              </button>
            </div>

            {/* List */}
            <div className="border border-border-default rounded-lg bg-surface-1 overflow-hidden">
              {isLoading ? (
                <div className="p-3 space-y-1.5">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-11 animate-pulse rounded-md bg-surface-2"
                      style={{ opacity: 1 - i * 0.3 }}
                    />
                  ))}
                </div>
              ) : !workspaces?.length ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-text-secondary">
                    No workspaces yet.
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Click New to create one.
                  </p>
                </div>
              ) : (
                <div className="p-1.5 flex flex-col gap-0.5">
                  {workspaces.map((ws) => (
                    <WorkspaceRow
                      key={ws.id}
                      workspace={ws}
                      onEdit={handleEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {modalOpen && (
        <WorkspaceModal
          key={editTarget?.id ?? "new"}
          workspace={editTarget ?? undefined}
          onClose={handleCloseModal}
          onSaved={handleCloseModal}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          workspace={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
