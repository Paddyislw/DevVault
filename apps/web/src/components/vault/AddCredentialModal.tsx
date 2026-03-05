'use client'
import { useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/trpc'

const CATEGORIES = ['API_KEY', 'DATABASE', 'SERVICE', 'SSH', 'OTHER'] as const
const CATEGORY_LABELS: Record<string, string> = {
  API_KEY: 'API Key', DATABASE: 'Database',
  SERVICE: 'Service', SSH: 'SSH', OTHER: 'Other',
}

interface Props {
  open: boolean
  onClose: () => void
  masterPassword: string
}

export function AddCredentialModal({ open, onClose, masterPassword }: Props) {
  const [form, setForm] = useState({
    name: '', service: '', value: '',
    category: 'API_KEY' as typeof CATEGORIES[number],
  })
  const [showValue, setShowValue] = useState(false)
  const utils = api.useUtils()
  const { data: workspaces = [] } = api.workspaces.list.useQuery()
  const defaultWorkspace = workspaces.find(w => w.isDefault) ?? workspaces[0]

  const create = api.credentials.create.useMutation({
    onSuccess: () => { utils.credentials.list.invalidate(); onClose() },
  })

  if (!open) return null

  function handleSubmit() {
    if (!form.name.trim() || !form.value.trim() || !defaultWorkspace) return
    create.mutate({
      workspaceId: defaultWorkspace.id,
      name: form.name,
      service: form.service || undefined,
      value: form.value,
      category: form.category,
      masterPassword,
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-1 border border-border-default rounded-lg w-full max-w-md shadow-lg pointer-events-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h2 className="font-display font-light text-base text-text-primary">New Credential</h2>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Name (e.g. Stripe Secret Key)"
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-sm outline-none border-b border-border-subtle pb-2 focus:border-border-strong transition-colors"
            />

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="label text-text-tertiary">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as typeof CATEGORIES[number] }))}
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="label text-text-tertiary">Service <span className="text-text-ghost">(optional)</span></label>
                <input
                  value={form.service}
                  onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  placeholder="e.g. AWS, GitHub"
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label text-text-tertiary">Value</label>
              <div className="flex items-center bg-surface-0 border border-border-default rounded px-3 py-2 focus-within:border-border-strong transition-colors">
                <input
                  type={showValue ? 'text' : 'password'}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="Paste your secret here"
                  className="flex-1 bg-transparent text-sm font-mono text-text-primary placeholder:text-text-tertiary outline-none"
                />
                <button
                  onClick={() => setShowValue(v => !v)}
                  className="text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showValue
                    ? <EyeOff size={14} strokeWidth={1.5} />
                    : <Eye size={14} strokeWidth={1.5} />
                  }
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={create.isPending}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {create.isPending ? 'Encrypting...' : 'Save Credential'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}