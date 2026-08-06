'use client'
import { useEffect, useState } from 'react'
import { X, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import type { RouterOutputs } from '@/lib/trpc'
import { api } from '@/lib/trpc'

type Credential = RouterOutputs['credentials']['list'][number]

const CATEGORIES = ['API_KEY', 'DATABASE', 'SERVICE', 'SSH', 'OTHER'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_LABELS: Record<Category, string> = {
  API_KEY: 'API Key', DATABASE: 'Database',
  SERVICE: 'Service', SSH: 'SSH', OTHER: 'Other',
}

// Value field adapts its label to what's actually being stored
const VALUE_LABELS: Record<Category, string> = {
  API_KEY: 'API Key', DATABASE: 'Connection String',
  SERVICE: 'Password', SSH: 'Private Key', OTHER: 'Value',
}

const emptyForm = {
  name: '', service: '', username: '', notes: '', value: '',
  category: 'API_KEY' as Category,
}

interface Props {
  open: boolean
  onClose: () => void
  masterPassword: string
  /** Present → edit an existing credential. Absent → create a new one. */
  credential?: Credential | null
}

export function CredentialFormModal({ open, onClose, masterPassword, credential }: Props) {
  const isEdit = !!credential
  const [form, setForm] = useState(emptyForm)
  const [showValue, setShowValue] = useState(false)
  const [error, setError] = useState('')
  const utils = api.useUtils()
  const { data: workspaces = [] } = api.workspaces.list.useQuery(undefined, { enabled: open && !isEdit })
  const defaultWorkspace = workspaces.find(w => w.isDefault) ?? workspaces[0]

  // Reset the form whenever the modal opens against a (possibly different) credential
  useEffect(() => {
    if (!open) return
    setError('')
    setShowValue(false)
    setForm(credential ? {
      name: credential.name,
      service: credential.service ?? '',
      username: credential.username ?? '',
      notes: credential.notes ?? '',
      value: '',
      category: credential.category as Category,
    } : emptyForm)
  }, [open, credential])

  const reveal = api.credentials.reveal.useMutation({
    onSuccess: (data) => { setForm(f => ({ ...f, value: data.value })); setShowValue(true) },
    onError: () => setError('Wrong password or decryption failed'),
  })

  // Mutations live on the component instance across open/close cycles — reset
  // their state so stale success/error flags don't leak into the next credential
  useEffect(() => {
    if (!open) return
    reveal.reset()
    create.reset()
    update.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, credential])

  const create = api.credentials.create.useMutation({
    onSuccess: () => { utils.credentials.list.invalidate(); onClose() },
    onError: () => setError('Failed to save credential'),
  })

  const update = api.credentials.update.useMutation({
    onSuccess: () => { utils.credentials.list.invalidate(); onClose() },
    onError: () => setError('Failed to save changes'),
  })

  if (!open) return null

  const isPending = create.isPending || update.isPending

  function handleSubmit() {
    setError('')
    if (!form.name.trim()) return
    if (!isEdit && !form.value.trim()) return

    const shared = {
      name: form.name.trim(),
      service: form.service.trim() || undefined,
      username: form.username.trim() || undefined,
      notes: form.notes.trim() || undefined,
      category: form.category,
      masterPassword,
    }

    if (isEdit) {
      update.mutate({
        id: credential!.id,
        ...shared,
        value: form.value.trim() || undefined,
      })
    } else {
      if (!defaultWorkspace) return
      create.mutate({
        workspaceId: defaultWorkspace.id,
        ...shared,
        value: form.value.trim(),
      })
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-150" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-1 border border-border-default rounded-lg w-full max-w-md shadow-md pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <KeyRound size={15} strokeWidth={1.5} className="text-accent" />
              <h2 className="font-display font-light text-base text-text-primary">
                {isEdit ? 'Edit Credential' : 'New Credential'}
              </h2>
            </div>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="label text-text-tertiary">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Stripe Secret Key"
                autoFocus
                className="w-full bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-strong transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="label text-text-tertiary">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                  className="bg-surface-0 border border-border-default rounded px-2 py-2 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="label text-text-tertiary">Service <span className="text-text-ghost">(optional)</span></label>
                <input
                  value={form.service}
                  onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  placeholder="e.g. AWS, GitHub"
                  className="bg-surface-0 border border-border-default rounded px-2 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="label text-text-tertiary">Username <span className="text-text-ghost">(optional)</span></label>
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="e.g. jane@company.com"
                className="bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="label text-text-tertiary">{VALUE_LABELS[form.category]}</label>
                {isEdit && !reveal.isSuccess && (
                  <button
                    onClick={() => reveal.mutate({ id: credential!.id, masterPassword })}
                    disabled={reveal.isPending}
                    className="text-[11px] text-accent hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-1"
                  >
                    {reveal.isPending && <Loader2 size={10} strokeWidth={2} className="animate-spin" />}
                    Load current value
                  </button>
                )}
              </div>
              <div className="flex items-center bg-surface-0 border border-border-default rounded px-3 py-2 focus-within:border-border-strong transition-colors">
                <input
                  type={showValue ? 'text' : 'password'}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={isEdit ? 'Leave blank to keep unchanged' : 'Paste your secret here'}
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

            <div className="flex flex-col gap-1.5">
              <label className="label text-text-tertiary">Notes <span className="text-text-ghost">(optional)</span></label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Anything else worth remembering about this credential"
                rows={2}
                className="w-full resize-none bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {error && <p className="text-[12px] text-danger">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !form.name.trim() || (!isEdit && !form.value.trim())}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Credential'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
