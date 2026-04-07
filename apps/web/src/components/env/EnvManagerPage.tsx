// components/env/EnvManagerPage.tsx
"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc";

import { AddEnvModal } from "./AddEnvModal";
import {
  Plus,
  Copy,
  Trash2,
  Check,
  FolderOpen,
  Key,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "../shared/page-header";

type EnvTab = "DEV" | "STAGING" | "PROD";

const ENV_LABELS: Record<EnvTab, string> = {
  DEV: "Development",
  STAGING: "Staging",
  PROD: "Production",
};

const ENV_COLORS: Record<EnvTab, string> = {
  DEV: "bg-blue-100 text-blue-700",
  STAGING: "bg-amber-100 text-amber-700",
  PROD: "bg-red-100 text-red-700",
};

/** Parse JSON string of variables into key-value array */
function parseVars(vars: string): { key: string; value: string }[] {
  try {
    const parsed = JSON.parse(vars);
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }
  } catch {
    // fallback: parse as .env format
    return vars
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      });
  }
  return [];
}

/** Convert key-value array to JSON string */
function varsToJson(vars: { key: string; value: string }[]): string {
  const obj: Record<string, string> = {};
  for (const v of vars) {
    if (v.key.trim()) obj[v.key.trim()] = v.value;
  }
  return JSON.stringify(obj);
}

/** Convert key-value array to .env format string */
function varsToEnvFormat(vars: { key: string; value: string }[]): string {
  return vars
    .filter((v) => v.key.trim())
    .map((v) => `${v.key}=${v.value}`)
    .join("\n");
}

export function EnvManagerPage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeEnv, setActiveEnv] = useState<EnvTab>("DEV");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVars, setEditingVars] = useState<{ key: string; value: string }[] | null>(null);
  const [copied, setCopied] = useState(false);
  const utils = api.useUtils();

  const { data: envSets = [], isLoading } = api.envSets.list.useQuery({});

  // Group by project
  const projects = useMemo(() => {
    const map = new Map<string, typeof envSets>();
    for (const env of envSets) {
      const list = map.get(env.projectName) ?? [];
      list.push(env);
      map.set(env.projectName, list);
    }
    return map;
  }, [envSets]);

  const projectNames = useMemo(() => Array.from(projects.keys()).sort(), [projects]);

  // Auto-select first project
  useMemo(() => {
    if (!selectedProject && projectNames.length > 0) {
      setSelectedProject(projectNames[0]);
    }
  }, [projectNames, selectedProject]);

  // Get current envSet for selected project + env tab
  const currentEnvSet = useMemo(() => {
    if (!selectedProject) return null;
    const projectEnvs = projects.get(selectedProject) ?? [];
    return projectEnvs.find((e) => e.environment === activeEnv) ?? null;
  }, [selectedProject, activeEnv, projects]);

  // Available environments for this project
  const projectEnvs = useMemo(() => {
    if (!selectedProject) return [];
    return (projects.get(selectedProject) ?? []).map((e) => e.environment);
  }, [selectedProject, projects]);

  // Current variables
  const currentVars = useMemo(() => {
    if (editingVars) return editingVars;
    if (!currentEnvSet) return [];
    return parseVars(currentEnvSet.variables);
  }, [currentEnvSet, editingVars]);

  const updateMutation = api.envSets.update.useMutation({
    onSuccess: () => {
      utils.envSets.list.invalidate();
      setEditingVars(null);
    },
  });

  const deleteMutation = api.envSets.delete.useMutation({
    onSuccess: () => {
      utils.envSets.list.invalidate();
      setEditingVars(null);
    },
  });

  function handleVarChange(index: number, field: "key" | "value", val: string) {
    const updated = [...(editingVars ?? currentVars)];
    updated[index] = { ...updated[index], [field]: val };
    setEditingVars(updated);
  }

  function handleAddVar() {
    setEditingVars([...(editingVars ?? currentVars), { key: "", value: "" }]);
  }

  function handleRemoveVar(index: number) {
    const updated = [...(editingVars ?? currentVars)];
    updated.splice(index, 1);
    setEditingVars(updated);
  }

  function handleSave() {
    if (!currentEnvSet || !editingVars) return;
    updateMutation.mutate({
      id: currentEnvSet.id,
      variables: varsToJson(editingVars),
    });
  }

  function handleDelete() {
    if (!currentEnvSet) return;
    if (!confirm(`Delete ${activeEnv} environment for ${selectedProject}?`)) return;
    deleteMutation.mutate({ id: currentEnvSet.id });
  }

  async function handleCopyEnv() {
    const text = varsToEnvFormat(currentVars);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Env Manager" subtitle="Environment variables per project">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} strokeWidth={1.5} />
          New Environment
        </button>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* Left — Project list */}
        <div className="w-[240px] flex-shrink-0 border-r border-border-subtle flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="label text-text-ghost">Projects</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-xs text-text-ghost">Loading...</div>
            ) : projectNames.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-text-secondary">No projects yet.</p>
                <p className="text-xs text-text-ghost mt-1">Create an environment to start.</p>
              </div>
            ) : (
              projectNames.map((name) => {
                const envCount = projects.get(name)?.length ?? 0;
                const isActive = selectedProject === name;
                return (
                  <button
                    key={name}
                    onClick={() => {
                      setSelectedProject(name);
                      setEditingVars(null);
                      // Auto-select first available env
                      const envs = projects.get(name) ?? [];
                      if (envs.length > 0) setActiveEnv(envs[0].environment as EnvTab);
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-border-subtle transition-colors flex items-center gap-2 ${
                      isActive ? "bg-surface-2" : "hover:bg-surface-1"
                    }`}
                  >
                    <FolderOpen size={14} strokeWidth={1.5} className="text-text-ghost flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{name}</p>
                      <p className="text-[10px] text-text-ghost">
                        {envCount} env{envCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {isActive && (
                      <ChevronRight size={12} strokeWidth={1.5} className="text-text-ghost" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right — Environment editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedProject ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <Key size={28} strokeWidth={1} className="text-text-ghost" />
              <p className="text-[14px] text-text-secondary">Select a project to manage env vars.</p>
              <p className="text-[13px] text-text-ghost">
                Or create a new environment to get started.
              </p>
            </div>
          ) : (
            <>
              {/* Environment tabs */}
              <div className="flex items-center justify-between border-b border-border-subtle px-6 py-2.5 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  {(["DEV", "STAGING", "PROD"] as EnvTab[]).map((env) => {
                    const exists = projectEnvs.includes(env);
                    const isActive = activeEnv === env;
                    return (
                      <button
                        key={env}
                        onClick={() => {
                          if (exists) {
                            setActiveEnv(env);
                            setEditingVars(null);
                          }
                        }}
                        disabled={!exists}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          isActive
                            ? ENV_COLORS[env]
                            : exists
                              ? "text-text-secondary hover:bg-surface-2"
                              : "text-text-ghost opacity-40 cursor-not-allowed"
                        }`}
                      >
                        {ENV_LABELS[env]}
                        {!exists && " (none)"}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Copy as .env */}
                  {currentEnvSet && currentVars.length > 0 && (
                    <button
                      onClick={handleCopyEnv}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      {copied ? (
                        <Check size={12} strokeWidth={1.5} className="text-accent" />
                      ) : (
                        <Copy size={12} strokeWidth={1.5} />
                      )}
                      Copy .env
                    </button>
                  )}

                  {/* Delete environment */}
                  {currentEnvSet && (
                    <button
                      onClick={handleDelete}
                      className="p-1.5 text-text-tertiary hover:text-danger transition-colors"
                      title="Delete environment"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>

              {/* Key-value editor */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {!currentEnvSet ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <p className="text-sm text-text-secondary">
                      No {ENV_LABELS[activeEnv].toLowerCase()} environment for {selectedProject}.
                    </p>
                    <button
                      onClick={() => setModalOpen(true)}
                      className="text-xs text-accent hover:underline"
                    >
                      Create one
                    </button>
                  </div>
                ) : currentVars.length === 0 && !editingVars ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <p className="text-sm text-text-secondary">No variables yet.</p>
                    <button
                      onClick={handleAddVar}
                      className="text-xs text-accent hover:underline"
                    >
                      Add your first variable
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="flex items-center gap-3 px-1">
                      <span className="label text-text-ghost w-[200px]">Key</span>
                      <span className="label text-text-ghost flex-1">Value</span>
                      <span className="w-8" />
                    </div>

                    {/* Variable rows */}
                    {currentVars.map((v, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <input
                          type="text"
                          value={v.key}
                          onChange={(e) => handleVarChange(i, "key", e.target.value)}
                          placeholder="VARIABLE_NAME"
                          className="w-[200px] bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm font-mono text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-border-strong transition-colors"
                        />
                        <input
                          type="text"
                          value={v.value}
                          onChange={(e) => handleVarChange(i, "value", e.target.value)}
                          placeholder="value"
                          className="flex-1 bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm font-mono text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-border-strong transition-colors"
                        />
                        <button
                          onClick={() => handleRemoveVar(i)}
                          className="w-8 h-8 flex items-center justify-center text-text-ghost opacity-0 group-hover:opacity-100 hover:text-danger transition-all"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}

                    {/* Add variable button */}
                    <button
                      onClick={handleAddVar}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <Plus size={12} strokeWidth={1.5} />
                      Add variable
                    </button>

                    {/* Save bar */}
                    {editingVars && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
                        <button
                          onClick={() => setEditingVars(null)}
                          className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={updateMutation.isPending}
                          className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                        >
                          {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <AddEnvModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultProject={selectedProject ?? undefined}
      />
    </div>
  );
}