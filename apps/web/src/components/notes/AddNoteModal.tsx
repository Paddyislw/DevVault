'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/trpc'
import type { RouterOutputs } from '@/lib/trpc'

type Note = RouterOutputs['notes']['list'][number]
type NoteType = 'NOTE' | 'COMMAND'

const LANGUAGES = ['bash', 'git', 'docker', 'sql', 'python', 'javascript', 'typescript', 'other']

interface Props {
  open: boolean
  onClose: () => void
  note?: Note
  defaultType: NoteType
}

function getInitial(note?: Note, defaultType: NoteType = 'NOTE') {
  return {
    type: (note?.type ?? defaultType) as NoteType,
    title: note?.title ?? '',
    content: note?.content ?? '',
    command: note?.command ?? '',
    language: note?.language ?? 'bash',
    warning: note?.warning ?? '',
    source: note?.source ?? '',
    tags: note?.tags?.join(', ') ?? '',
  }
}

export function AddNoteModal({ open, onClose, note, defaultType }: Props) {
  const [form, setForm] = useState(() => getInitial(note, defaultType))
  const utils = api.useUtils()
  const { data: workspaces = [] } = api.workspaces.list.useQuery()
  const defaultWorkspace = workspaces.find(w => w.isDefault) ?? workspaces[0]

  const create = api.notes.create.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); onClose() },
  })
  const update = api.notes.update.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); onClose() },
  })

  if (!open) return null

  const isEditing = !!note
  const isCommand = form.type === 'COMMAND'

  function handleSubmit() {
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    if (!form.title.trim()) return
    if (isCommand && !form.command.trim()) return

    if (isEditing) {
      update.mutate({
        id: note.id,
        title: form.title,
        content: form.content,
        command: isCommand ? form.command : undefined,
        language: form.language || undefined,
        warning: form.warning || undefined,
        source: form.source || undefined,
        tags,
      })
    } else {
      create.mutate({
        workspaceId: defaultWorkspace?.id ?? '',
        title: form.title,
        content: form.content,
        type: form.type,
        command: isCommand ? form.command : undefined,
        language: form.language || undefined,
        warning: form.warning || undefined,
        source: form.source || undefined,
        tags,
      })
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-surface-1 border border-border-default rounded-lg w-full max-w-xl shadow-lg pointer-events-auto flex flex-col"
          style={{ maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle flex-shrink-0">
            <h2 className="font-display font-light text-base text-text-primary">
              {isEditing ? `Edit ${isCommand ? 'Command' : 'Note'}` : `New ${form.type === 'COMMAND' ? 'Command' : 'Note'}`}
            </h2>
            <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
            {/* Type toggle — only on create */}
            {!isEditing && (
              <div className="flex items-center border border-border-default rounded overflow-hidden w-fit">
                {(['NOTE', 'COMMAND'] as NoteType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setForm(f => ({ ...f, type }))}
                    className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      form.type === type
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {type === 'NOTE' ? 'Note' : 'Command'}
                  </button>
                ))}
              </div>
            )}

            {/* Title */}
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={isCommand ? 'e.g. Force delete node_modules' : 'Note title'}
              className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-sm outline-none border-b border-border-subtle pb-2 focus:border-border-strong transition-colors"
            />

            {isCommand ? (
              <>
                {/* Command input */}
                <div className="flex flex-col gap-1.5">
                  <label className="label text-text-tertiary">Command</label>
                  <input
                    value={form.command}
                    onChange={e => setForm(f => ({ ...f, command: e.target.value }))}
                    placeholder="rm -rf node_modules package-lock.json"
                    className="font-mono text-[13px] bg-surface-0 border border-border-default rounded px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                  />
                </div>

                {/* Language + Warning row */}
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="label text-text-tertiary">Language</label>
                    <select
                      value={form.language}
                      onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong"
                    >
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="label text-text-tertiary">Warning <span className="text-text-ghost">(optional)</span></label>
                    <input
                      value={form.warning}
                      onChange={e => setForm(f => ({ ...f, warning: e.target.value }))}
                      placeholder="Dangerous — permanently deletes without trash"
                      className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                    />
                  </div>
                </div>

                {/* Explanation */}
                <div className="flex flex-col gap-1.5">
                  <label className="label text-text-tertiary">Explanation <span className="text-text-ghost">(optional)</span></label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="rm = remove, -r = recursive, -f = force. Deletes without confirmation."
                    rows={3}
                    className="bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors resize-none"
                  />
                </div>
              </>
            ) : (
              /* Note content — plain textarea */
              <div className="flex flex-col gap-1.5">
                <label className="label text-text-tertiary">Content <span className="text-text-ghost">(markdown supported)</span></label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your note here... Markdown is supported."
                  rows={8}
                  className="bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors resize-none font-mono"
                />
              </div>
            )}

            {/* Tags + Source row */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="label text-text-tertiary">Tags <span className="text-text-ghost">(comma separated)</span></label>
                <input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="linux, terminal, cleanup"
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="label text-text-tertiary">Source <span className="text-text-ghost">(optional)</span></label>
                <input
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="stackoverflow, docs, colleague"
                  className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle flex-shrink-0">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={create.isPending || update.isPending}
              className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Save Changes' : isCommand ? 'Save Command' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}