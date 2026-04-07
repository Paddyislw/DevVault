// components/env/AddEnvModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/trpc";
import { WorkspacePicker } from "@/components/tasks/WorkspacePicker";

interface AddEnvModalProps {
  open: boolean;
  onClose: () => void;
  defaultProject?: string;
}

export function AddEnvModal({ open, onClose, defaultProject }: AddEnvModalProps) {
  const [projectName, setProjectName] = useState("");
  const [environment, setEnvironment] = useState<"DEV" | "STAGING" | "PROD">("DEV");
  const [workspaceId, setWorkspaceId] = useState("");
  const [vars, setVars] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const projectRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const { data: workspaces } = api.workspaces.list.useQuery();

  // Set defaults
  useEffect(() => {
    if (!open) return;
    setProjectName(defaultProject ?? "");
    setEnvironment("DEV");
    setVars([{ key: "", value: "" }]);

    if (!workspaceId && workspaces?.length) {
      const def = workspaces.find((w) => w.isDefault) ?? workspaces[0];
      if (def) setWorkspaceId(def.id);
    }

    setTimeout(() => projectRef.current?.focus(), 50);
  }, [open, defaultProject, workspaces, workspaceId]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const create = api.envSets.create.useMutation({
    onSuccess: () => {
      utils.envSets.list.invalidate();
      onClose();
    },
  });

  function handleVarChange(index: number, field: "key" | "value", val: string) {
    const updated = [...vars];
    updated[index] = { ...updated[index], [field]: val };
    setVars(updated);
  }

  function handleAddVar() {
    setVars([...vars, { key: "", value: "" }]);
  }

  function handleRemoveVar(index: number) {
    const updated = [...vars];
    updated.splice(index, 1);
    setVars(updated);
  }

  function handlePasteEnv(text: string) {
    const lines = text.split("\n").filter((l) => l.includes("=") && !l.startsWith("#"));
    if (lines.length === 0) return;

    const parsed = lines.map((line) => {
      const idx = line.indexOf("=");
      return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    });

    setVars(parsed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !workspaceId) return;
    if (create.isPending) return;

    const obj: Record<string, string> = {};
    for (const v of vars) {
      if (v.key.trim()) obj[v.key.trim()] = v.value;
    }

    create.mutate({
      workspaceId,
      projectName: projectName.trim(),
      environment,
      variables: JSON.stringify(obj),
    });
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface-1 border border-border-default rounded-lg w-full max-w-lg shadow-lg pointer-events-auto flex flex-col"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-shrink-0">
            <h2 className="font-display font-light text-base text-text-primary normal-case">
              New Environment
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
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Project name */}
            <div className="flex flex-col gap-1.5">
              <span className="label text-text-secondary">Project name</span>
              <input
                ref={projectRef}
                type="text"
                placeholder="e.g. devvault, my-api"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {/* Environment + Workspace row */}
            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Environment</span>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as "DEV" | "STAGING" | "PROD")}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                >
                  <option value="DEV">Development</option>
                  <option value="STAGING">Staging</option>
                  <option value="PROD">Production</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="label text-text-secondary">Workspace</span>
                <WorkspacePicker value={workspaceId} onChange={setWorkspaceId} />
              </div>
            </div>

            {/* Variables */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="label text-text-secondary">Variables</span>
                <button
                  type="button"
                  onClick={() => {
                    const text = prompt("Paste your .env content:");
                    if (text) handlePasteEnv(text);
                  }}
                  className="text-[10px] text-accent hover:underline"
                >
                  Paste .env
                </button>
              </div>

              <div className="space-y-2">
                {vars.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <input
                      type="text"
                      value={v.key}
                      onChange={(e) => handleVarChange(i, "key", e.target.value)}
                      placeholder="KEY"
                      className="w-[140px] bg-surface-0 border border-border-default rounded px-2 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-border-strong transition-colors"
                    />
                    <input
                      type="text"
                      value={v.value}
                      onChange={(e) => handleVarChange(i, "value", e.target.value)}
                      placeholder="value"
                      className="flex-1 bg-surface-0 border border-border-default rounded px-2 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-border-strong transition-colors"
                    />
                    {vars.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVar(i)}
                        className="w-6 h-6 flex items-center justify-center text-text-ghost opacity-0 group-hover:opacity-100 hover:text-danger transition-all"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddVar}
                className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors mt-1"
              >
                <Plus size={11} strokeWidth={1.5} />
                Add variable
              </button>
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
                  disabled={!projectName.trim() || !workspaceId || create.isPending}
                  className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {create.isPending ? "Creating..." : "Create environment"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}