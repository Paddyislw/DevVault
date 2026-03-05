'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/trpc'
import type { RouterOutputs } from '@/lib/trpc'

type Idea = RouterOutputs['ideas']['list'][number]

interface Props {
  open: boolean
  onClose: () => void
  idea?: Idea
}

function getInitial(idea?: Idea) {
  return {
    title: idea?.title ?? '',
    description: idea?.description ?? '',
    techStack: idea?.techStack.join(', ') ?? '',
    references: idea?.references.join(', ') ?? '',
    status: idea?.status ?? 'RAW' as const,
  }
}

export function AddIdeaModal({ open, onClose, idea }: Props) {
  const [form, setForm] = useState(() => getInitial(idea))
  const utils = api.useUtils()
  const isEditing = !!idea

  const create = api.ideas.create.useMutation({
    onSuccess: () => { utils.ideas.list.invalidate(); onClose() },
  })
  const update = api.ideas.update.useMutation({
    onSuccess: () => { utils.ideas.list.invalidate(); onClose() },
  })

  if (!open) return null

  function handleSubmit() {
    if (!form.title.trim()) return
    const techStack = form.techStack.split(',').map(t => t.trim()).filter(Boolean)
    const references = form.references.split(',').map(r => r.trim()).filter(Boolean)

    if (isEditing) {
      update.mutate({ id: idea.id, ...form, techStack, references })
    } else {
      create.mutate({ ...form, techStack, references })
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-1 border border-border-default rounded-lg w-full max-w-lg shadow-lg pointer-events-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h2 className="font-display font-light text-base text-text-primary">
              {isEditing ? 'Edit Idea' : 'New Idea'}
            </h2>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="What's the idea?"
              autoFocus
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-sm outline-none border-b border-border-subtle pb-2 focus:border-border-strong transition-colors"
            />

            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What problem does it solve? Who's it for?"
              rows={3}
              className="bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors resize-none"
            />

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="label text-text-tertiary">Tech stack <span className="text-text-ghost">(comma separated)</span></label>
                <input
                  value={form.techStack}
                  onChange={e => setForm(f => ({ ...f, techStack: e.target.value }))}
                  placeholder="Next.js, Prisma, tRPC"
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="label text-text-tertiary">References <span className="text-text-ghost">(optional)</span></label>
                <input
                  value={form.references}
                  onChange={e => setForm(f => ({ ...f, references: e.target.value }))}
                  placeholder="Similar apps, articles, repos"
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={create.isPending || update.isPending}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Save Changes' : 'Save Idea'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
