'use client'
import { useState } from 'react'
import type { RouterOutputs } from '@/lib/trpc'
import { api } from '@/lib/trpc'
import { Copy, Check, Edit2, Trash2, AlertTriangle, LayoutGrid, List } from 'lucide-react'

type Note = RouterOutputs['notes']['list'][number]

interface Props {
  commands: Note[]
  isLoading: boolean
  onEdit: (note: Note) => void
}

function CopyButton({ text, noteId }: { text: string; noteId: string }) {
  const [copied, setCopied] = useState(false)
  const incrementCopy = api.notes.incrementCopyCount.useMutation()

  function handleCopy() {
    navigator.clipboard.writeText(text)
    incrementCopy.mutate({ id: noteId })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary border border-border-default rounded transition-colors bg-surface-1 hover:bg-surface-2"
    >
      {copied
        ? <Check size={11} strokeWidth={1.5} className="text-green-600" />
        : <Copy size={11} strokeWidth={1.5} />
      }
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function CommandsView({ commands, isLoading, onEdit }: Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const utils = api.useUtils()

  const deleteNote = api.notes.delete.useMutation({
    onSettled: () => utils.notes.list.invalidate(),
  })

  // Group by language
  const grouped = commands.reduce((acc, cmd) => {
    const lang = cmd.language ?? 'other'
    return { ...acc, [lang]: [...(acc[lang] ?? []), cmd] }
  }, {} as Record<string, Note[]>)

  const languages = Object.keys(grouped).sort()

  if (isLoading) return (
    <div className="flex-1 p-6 grid grid-cols-3 gap-3 content-start">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-24 animate-pulse rounded bg-surface-2" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  )

  if (commands.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-1">
      <p className="text-[13px] text-text-secondary">No commands saved yet.</p>
      <p className="text-[12px] text-text-ghost">Save commands with explanations and tags.</p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
        <p className="text-[12px] text-text-tertiary">{commands.length} command{commands.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center border border-border-default rounded overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-surface-3 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            <LayoutGrid size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-surface-3 text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            <List size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {viewMode === 'grid' ? (
          // ── GRID VIEW ──────────────────────────────────────
          <div className="space-y-6">
            {languages.map(lang => (
              <div key={lang}>
                <p className="label text-text-tertiary mb-3">{lang}</p>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {grouped[lang].map(cmd => (
                    <div
                      key={cmd.id}
                      className="bg-surface-1 border border-border-default rounded-md p-3 flex flex-col gap-2 hover:border-border-strong transition-colors group"
                    >
                      {/* Title + actions */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-medium text-text-primary leading-snug">{cmd.title}</p>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => onEdit(cmd)}
                            className="p-1 text-text-tertiary hover:text-text-primary rounded transition-colors"
                          >
                            <Edit2 size={11} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => {
                              if (deleteConfirmId === cmd.id) {
                                deleteNote.mutate({ id: cmd.id })
                                setDeleteConfirmId(null)
                              } else {
                                setDeleteConfirmId(cmd.id)
                              }
                            }}
                            onBlur={() => setDeleteConfirmId(null)}
                            className={`p-1 rounded transition-colors ${
                              deleteConfirmId === cmd.id
                                ? 'text-red-500'
                                : 'text-text-tertiary hover:text-red-500'
                            }`}
                          >
                            <Trash2 size={11} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>

                      {/* Warning badge */}
                      {cmd.warning && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={10} strokeWidth={1.5} className="text-red-500" />
                          <span className="text-[10px] text-red-500 truncate">{cmd.warning}</span>
                        </div>
                      )}

                      {/* Command block */}
                      <div className="bg-surface-0 border border-border-subtle rounded px-2.5 py-2 flex items-center justify-between gap-2">
                        <code className="font-mono text-[11px] text-text-primary truncate flex-1">
                          {cmd.command}
                        </code>
                        <CopyButton text={cmd.command ?? ''} noteId={cmd.id} />
                      </div>

                      {/* Explanation */}
                      {cmd.content && (
                        <p className="text-[11px] text-text-ghost leading-relaxed line-clamp-2">
                          {cmd.content}
                        </p>
                      )}

                      {/* Tags */}
                      {cmd.tags && cmd.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {cmd.tags.map(tag => (
                            <span key={tag} className="text-[10px] text-text-ghost">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ── TABLE VIEW ─────────────────────────────────────
          <div className="space-y-6">
            {languages.map(lang => (
              <div key={lang}>
                <p className="label text-text-tertiary mb-2">{lang}</p>
                <div className="border border-border-default rounded-md overflow-hidden">
                  {grouped[lang].map((cmd, idx) => (
                    <div
                      key={cmd.id}
                      className={`flex items-center gap-4 px-4 py-3 group hover:bg-surface-2 transition-colors ${
                        idx !== grouped[lang].length - 1 ? 'border-b border-border-subtle' : ''
                      }`}
                    >
                      {/* Title */}
                      <div className="w-48 flex-shrink-0">
                        <p className="text-[12px] text-text-primary truncate">{cmd.title}</p>
                        {cmd.warning && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={9} strokeWidth={1.5} className="text-red-500" />
                            <span className="text-[10px] text-red-500 truncate">{cmd.warning}</span>
                          </div>
                        )}
                      </div>

                      {/* Command */}
                      <code className="font-mono text-[12px] text-text-primary flex-1 truncate">
                        {cmd.command}
                      </code>

                      {/* Explanation */}
                      <p className="text-[11px] text-text-ghost flex-1 truncate hidden xl:block">
                        {cmd.content || '—'}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <CopyButton text={cmd.command ?? ''} noteId={cmd.id} />
                        <button
                          onClick={() => onEdit(cmd)}
                          className="p-1 text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all rounded"
                        >
                          <Edit2 size={12} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => {
                            if (deleteConfirmId === cmd.id) {
                              deleteNote.mutate({ id: cmd.id })
                              setDeleteConfirmId(null)
                            } else {
                              setDeleteConfirmId(cmd.id)
                            }
                          }}
                          onBlur={() => setDeleteConfirmId(null)}
                          className={`p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                            deleteConfirmId === cmd.id
                              ? 'text-red-500 opacity-100'
                              : 'text-text-tertiary hover:text-red-500'
                          }`}
                        >
                          <Trash2 size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
