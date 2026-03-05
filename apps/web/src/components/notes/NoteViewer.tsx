'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import type { RouterOutputs } from '@/lib/trpc'
import { Copy, Edit2, Trash2, Check, AlertTriangle } from 'lucide-react'

type Note = RouterOutputs['notes']['list'][number]

interface Props {
  note: Note | null
  onEdit: (note: Note) => void
}

export function NoteViewer({ note, onEdit }: Props) {
  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const utils = api.useUtils()

  const deleteNote = api.notes.delete.useMutation({
    onSettled: () => utils.notes.list.invalidate(),
  })
  const incrementCopy = api.notes.incrementCopyCount.useMutation()

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    if (note) incrementCopy.mutate({ id: note.id })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDelete() {
    if (!note) return
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    deleteNote.mutate({ id: note.id })
    setDeleteConfirm(false)
  }

  if (!note) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-[13px] text-text-ghost">Select a note to view</p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-3 border-b border-border-subtle flex-shrink-0">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[22px] leading-none text-text-primary">{note.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            {note.language && (
              <span className="text-[11px] text-text-tertiary bg-surface-2 px-2 py-0.5 rounded">
                {note.language}
              </span>
            )}
            {note.tags?.map(tag => (
              <span key={tag} className="text-[11px] text-text-ghost">#{tag}</span>
            ))}
            {note.source && (
              <span className="text-[11px] text-text-ghost">via {note.source}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded hover:bg-surface-2"
          >
            <Edit2 size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={handleDelete}
            onBlur={() => setDeleteConfirm(false)}
            className={`p-1.5 rounded transition-colors ${
              deleteConfirm ? 'text-red-500 bg-red-50' : 'text-text-tertiary hover:text-red-500'
            }`}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Body — different for NOTE vs COMMAND */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {note.type === 'COMMAND' ? (
          <div className="flex flex-col gap-4">
            {/* Danger warning */}
            {note.warning && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded">
                <AlertTriangle size={14} strokeWidth={1.5} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-600">{note.warning}</p>
              </div>
            )}

            {/* The actual command block */}
            <div className="flex flex-col gap-2">
              <p className="label text-text-tertiary">Command</p>
              <div className="flex items-start justify-between gap-3 bg-surface-0 border border-border-default rounded px-3 py-3">
                <code className="font-mono text-[13px] text-text-primary flex-1 break-all">
                  {note.command}
                </code>
                <button
                  onClick={() => handleCopy(note.command ?? '')}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary border border-border-default rounded transition-colors flex-shrink-0"
                >
                  {copied
                    ? <Check size={11} strokeWidth={1.5} className="text-green-600" />
                    : <Copy size={11} strokeWidth={1.5} />
                  }
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Explanation */}
            {note.content && (
              <div className="flex flex-col gap-2">
                <p className="label text-text-tertiary">Explanation</p>
                <p className="text-[13px] text-text-secondary leading-relaxed">{note.content}</p>
              </div>
            )}

            {(note.copyCount ?? 0) > 0 && (
              <p className="text-[11px] text-text-ghost">Copied {note.copyCount} time{note.copyCount !== 1 ? 's' : ''}</p>
            )}
          </div>
        ) : (
          /* NOTE type — markdown rendered as prose */
          <div
            className="prose prose-sm max-w-none text-text-primary"
            style={{ fontSize: '13px', lineHeight: '1.7' }}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(note.content ?? '')
            }}
          />
        )}
      </div>
    </div>
  )
}

// Lightweight markdown renderer — no extra deps
function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-[15px] font-semibold text-text-primary mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-[17px] font-semibold text-text-primary mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-[20px] font-semibold text-text-primary mt-6 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="font-mono text-[12px] bg-surface-2 px-1 py-0.5 rounded">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="text-text-secondary ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-text-secondary ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>')
    .replace(/^(.+)$/, '<p class="mb-3">$1</p>')
}