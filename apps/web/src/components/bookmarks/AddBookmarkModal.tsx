'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { api } from '@/lib/trpc'

const CATEGORIES = ['DESIGN', 'CODE', 'TUTORIALS', 'TOOLS', 'APIS_DOCS', 'CUSTOM'] as const
const CATEGORY_LABELS: Record<string, string> = {
  DESIGN: 'Design', CODE: 'Code', TUTORIALS: 'Tutorials',
  TOOLS: 'Tools', APIS_DOCS: 'APIs & Docs', CUSTOM: 'Custom',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function AddBookmarkModal({ open, onClose }: Props) {
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('CUSTOM')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const utils = api.useUtils()

  const { data: workspaces = [] } = api.workspaces.list.useQuery()
  const defaultWorkspace = workspaces.find(w => w.isDefault) ?? workspaces[0]

  const create = api.bookmarks.create.useMutation({
    onSuccess: () => {
      utils.bookmarks.list.invalidate()
      setUrl('')
      setTags('')
      onClose()
    },
    onError: () => setError('Failed to save bookmark. Check the URL and try again.'),
  })

  if (!open) return null

  function handleSubmit() {
    setError('')
    if (!url.trim()) return
    // Basic URL validation
    try { new URL(url) } catch {
      setError('Invalid URL — include https://')
      return
    }
    if (!defaultWorkspace) return
    create.mutate({
      workspaceId: defaultWorkspace.id,
      url: url.trim(),
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-surface-1 border border-border-default rounded-lg w-full max-w-md shadow-lg pointer-events-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h2 className="font-display font-light text-base text-text-primary">Save Bookmark</h2>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* URL — primary field */}
            <div className="flex flex-col gap-1.5">
              <label className="label text-text-tertiary">URL</label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="https://..."
                autoFocus
                className="bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors font-mono"
              />
              {create.isPending && (
                <p className="text-[11px] text-text-ghost flex items-center gap-1.5">
                  <Loader2 size={11} strokeWidth={1.5} className="animate-spin" />
                  Fetching title and favicon...
                </p>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="label text-text-tertiary">Category</label>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`text-[11px] px-2.5 py-1 rounded transition-colors ${
                      category === cat
                        ? 'bg-accent text-white'
                        : 'bg-surface-2 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="label text-text-tertiary">Tags <span className="text-text-ghost">(optional, comma separated)</span></label>
              <input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="react, docs, reference"
                className="bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
              />
            </div>

            {error && <p className="text-[12px] text-red-500">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={create.isPending || !url.trim()}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {create.isPending ? 'Saving...' : 'Save Bookmark'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}