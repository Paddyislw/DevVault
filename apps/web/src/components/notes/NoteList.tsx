'use client'
import type { RouterOutputs } from '@/lib/trpc'
import { api } from '@/lib/trpc'
import { Search, Pin } from 'lucide-react'

type Note = RouterOutputs['notes']['list'][number]

interface Props {
  notes: Note[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  search: string
  onSearchChange: (v: string) => void
  activeType: 'NOTE' | 'COMMAND'
}

export function NoteList({ notes, isLoading, selectedId, onSelect, search, onSearchChange, activeType }: Props) {
  const utils = api.useUtils()

  const togglePin = api.notes.togglePin.useMutation({
    onSettled: () => utils.notes.list.invalidate(),
  })

  return (
    <div className="w-72 flex-shrink-0 border-r border-border-default flex flex-col">
      {/* Search */}
      <div className="px-3 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2 bg-surface-0 border border-border-default rounded px-2.5 py-1.5">
          <Search size={13} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={activeType === 'NOTE' ? 'Search notes...' : 'Search commands...'}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 animate-pulse rounded bg-surface-2" style={{ opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1 px-4">
            <p className="text-[13px] text-text-secondary text-center">
              {activeType === 'NOTE' ? 'No notes yet.' : 'No commands saved yet.'}
            </p>
            <p className="text-[12px] text-text-ghost text-center">
              {activeType === 'NOTE' ? 'Create a note to get started.' : 'Save a command with explanation and tags.'}
            </p>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {notes.map(note => (
              <button
                key={note.id}
                onClick={() => onSelect(note.id)}
                className={`w-full text-left px-3 py-2.5 rounded transition-colors group ${
                  selectedId === note.id ? 'bg-surface-3' : 'hover:bg-surface-2'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {note.isPinned && (
                        <Pin size={10} strokeWidth={1.5} className="text-accent flex-shrink-0" />
                      )}
                      <p className="text-[13px] text-text-primary truncate">{note.title}</p>
                    </div>
                    {activeType === 'NOTE' ? (
                      <p className="text-[11px] text-text-ghost mt-0.5 truncate">
                        {note.content?.slice(0, 60) || 'No content'}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        {note.language && (
                          <span className="text-[11px] text-text-tertiary">{note.language}</span>
                        )}
                        {note.warning && (
                          <span className="text-[11px] text-red-500">⚠ dangerous</span>
                        )}
                        {(note.copyCount ?? 0) > 0 && (
                          <span className="text-[11px] text-text-ghost">{note.copyCount}×</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); togglePin.mutate({ id: note.id }) }}
                    className={`flex-shrink-0 transition-colors ${
                      note.isPinned
                        ? 'text-accent'
                        : 'text-text-ghost opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Pin size={12} strokeWidth={1.5} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}