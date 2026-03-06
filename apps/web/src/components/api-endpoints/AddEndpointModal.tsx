'use client'
import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/trpc'
interface Endpoint {
  id: string
  name: string
  url: string
  method: string
  headers: unknown
  body: unknown
  authType: string | null
  authValue: string | null
  projectName: string | null
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
const AUTH_TYPES = ['NONE', 'BEARER', 'API_KEY', 'BASIC'] as const
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-700', POST: 'text-blue-700',
  PUT: 'text-amber-700', PATCH: 'text-purple-700', DELETE: 'text-red-700',
}

interface Prefill {
  url: string
  method: string
  headers: Record<string, string>
  body: string
  authType: string
  authValue: string
}

interface Props {
  open: boolean
  onClose: () => void
  endpoint?: Endpoint
  prefill?: Prefill
  onSaved?: (id: string) => void
}

function getInitial(endpoint?: Endpoint, prefill?: Prefill) {
  if (prefill) {
    return {
      name: '',
      url: prefill.url,
      method: (prefill.method ?? 'GET') as typeof METHODS[number],
      authType: (prefill.authType ?? 'NONE') as typeof AUTH_TYPES[number],
      authValue: prefill.authValue ?? '',
      projectName: '',
      body: prefill.body ?? '',
      headers: Object.entries(prefill.headers ?? {})
        .map(([k, v]) => ({ key: k, value: v })),
    }
  }
  return {
    name: endpoint?.name ?? '',
    url: endpoint?.url ?? '',
    method: (endpoint?.method ?? 'GET') as typeof METHODS[number],
    authType: (endpoint?.authType ?? 'NONE') as typeof AUTH_TYPES[number],
    authValue: endpoint?.authValue ?? '',
    projectName: endpoint?.projectName ?? '',
    body: (endpoint?.body as any)?.raw ?? '',
    headers: Object.entries((endpoint?.headers as Record<string, string>) ?? {})
      .map(([k, v]) => ({ key: k, value: v })),
  }
}

export function AddEndpointModal({ open, onClose, endpoint, prefill, onSaved }: Props) {
  const [form, setForm] = useState(() => getInitial(endpoint, prefill))
  const [activeTab, setActiveTab] = useState<'params' | 'auth' | 'body'>('params')
  const utils = api.useUtils()
  const isEditing = !!endpoint

  const { data: workspaces = [] } = api.workspaces.list.useQuery()
  const defaultWorkspace = workspaces.find(w => w.isDefault) ?? workspaces[0]

  const create = api.apiEndpoints.create.useMutation({
    onSuccess: (data) => { utils.apiEndpoints.list.invalidate(); onSaved?.(data.id); onClose() },
  })
  const update = api.apiEndpoints.update.useMutation({
    onSuccess: () => { utils.apiEndpoints.list.invalidate(); onClose() },
  })

  if (!open) return null

  function handleSubmit() {
    if (!form.name.trim() || !form.url.trim()) return
    const headers = form.headers.reduce((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value
      return acc
    }, {} as Record<string, string>)

    if (isEditing) {
      update.mutate({
        id: endpoint.id,
        name: form.name,
        url: form.url,
        method: form.method,
        headers,
        body: form.body,
        authType: form.authType,
        authValue: form.authValue || undefined,
        projectName: form.projectName || undefined,
      })
    } else {
      if (!defaultWorkspace) return
      create.mutate({
        workspaceId: defaultWorkspace.id,
        name: form.name,
        url: form.url,
        method: form.method,
        headers,
        body: form.body,
        authType: form.authType,
        authValue: form.authValue || undefined,
        projectName: form.projectName || undefined,
      })
    }
  }

  function addHeader() {
    setForm(f => ({ ...f, headers: [...f.headers, { key: '', value: '' }] }))
  }

  function removeHeader(i: number) {
    setForm(f => ({ ...f, headers: f.headers.filter((_, idx) => idx !== i) }))
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-1 border border-border-default rounded-lg w-full max-w-2xl shadow-lg pointer-events-auto flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-shrink-0">
            <h2 className="font-display font-light text-base text-text-primary">
              {isEditing ? 'Edit Endpoint' : 'New Endpoint'}
            </h2>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
            {/* Name + project */}
            <div className="flex gap-3">
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Endpoint name"
                autoFocus
                className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary text-sm outline-none border-b border-border-subtle pb-2 focus:border-border-strong transition-colors"
              />
              <input
                value={form.projectName}
                onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))}
                placeholder="Project (optional)"
                className="w-36 bg-transparent text-text-primary placeholder:text-text-tertiary text-sm outline-none border-b border-border-subtle pb-2 focus:border-border-strong transition-colors"
              />
            </div>

            {/* Method + URL */}
            <div className="flex items-center gap-2 bg-surface-0 border border-border-default rounded px-2 py-1.5">
              <select
                value={form.method}
                onChange={e => setForm(f => ({ ...f, method: e.target.value as typeof METHODS[number] }))}
                className={`bg-transparent text-[12px] font-mono font-bold outline-none cursor-pointer ${METHOD_COLORS[form.method]}`}
              >
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="text-border-strong">|</span>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://api.example.com/endpoint"
                className="flex-1 bg-transparent text-sm font-mono text-text-primary placeholder:text-text-tertiary outline-none"
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border-subtle pb-0">
              {(['params', 'auth', 'body'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[12px] capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'border-accent text-accent font-medium'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'params' && (
              <div className="flex flex-col gap-2">
                {form.headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={header.key}
                      onChange={e => setForm(f => ({
                        ...f,
                        headers: f.headers.map((h, idx) => idx === i ? { ...h, key: e.target.value } : h)
                      }))}
                      placeholder="Key"
                      className="flex-1 bg-surface-0 border border-border-default rounded px-2 py-1.5 text-[12px] font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
                    />
                    <input
                      value={header.value}
                      onChange={e => setForm(f => ({
                        ...f,
                        headers: f.headers.map((h, idx) => idx === i ? { ...h, value: e.target.value } : h)
                      }))}
                      placeholder="Value"
                      className="flex-1 bg-surface-0 border border-border-default rounded px-2 py-1.5 text-[12px] font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
                    />
                    <button onClick={() => removeHeader(i)} className="p-1 text-text-tertiary hover:text-red-500 transition-colors">
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addHeader}
                  className="flex items-center gap-1 text-[12px] text-text-secondary hover:text-text-primary transition-colors w-fit"
                >
                  <Plus size={12} strokeWidth={1.5} />
                  Add header
                </button>
              </div>
            )}

            {activeTab === 'auth' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="label text-text-tertiary">Auth type</label>
                  <select
                    value={form.authType}
                    onChange={e => setForm(f => ({ ...f, authType: e.target.value as typeof AUTH_TYPES[number] }))}
                    className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong w-48"
                  >
                    {AUTH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {form.authType !== 'NONE' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="label text-text-tertiary">
                      {form.authType === 'BEARER' ? 'Token' : form.authType === 'BASIC' ? 'username:password' : 'API Key'}
                    </label>
                    <input
                      value={form.authValue}
                      onChange={e => setForm(f => ({ ...f, authValue: e.target.value }))}
                      placeholder={form.authType === 'BASIC' ? 'user:password' : 'Enter value...'}
                      className="bg-surface-0 border border-border-default rounded px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'body' && (
              <div className="flex flex-col gap-1.5">
                <label className="label text-text-tertiary">Body (raw JSON)</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder={'{\n  "key": "value"\n}'}
                  rows={8}
                  className="bg-surface-0 border border-border-default rounded px-3 py-2 text-[12px] font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong resize-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle flex-shrink-0">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={create.isPending || update.isPending}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isEditing ? 'Save Changes' : 'Create Endpoint'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}