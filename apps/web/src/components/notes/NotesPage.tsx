'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import type { RouterOutputs } from '@/lib/trpc'
import { NoteList } from './NoteList'
import { NoteViewer } from './NoteViewer'
import { CommandsView } from './CommandsView'
import { AddNoteModal } from './AddNoteModal'
import { Plus } from 'lucide-react'

type Note = RouterOutputs['notes']['list'][number]
type NoteType = 'NOTE' | 'COMMAND'

export function NotesPage() {
  const [activeType, setActiveType] = useState<NoteType>('NOTE')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [search, setSearch] = useState('')

  const { data: notes = [], isLoading } = api.notes.list.useQuery({
    type: activeType,
    search: search || undefined,
  })

  const selected = notes.find(n => n.id === selectedId) ?? notes[0] ?? null

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div className="flex items-end justify-between border-b border-border-subtle px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[32px] leading-none text-text-primary">
              Notes
            </h1>
            <p className="text-[12px] text-text-tertiary tracking-wide">
              {notes.length} {activeType === 'NOTE' ? 'note' : 'command'}{notes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Type toggle */}
          <div className="flex items-center border border-border-default rounded overflow-hidden">
            {(['NOTE', 'COMMAND'] as NoteType[]).map(type => (
              <button
                key={type}
                onClick={() => { setActiveType(type); setSelectedId(null) }}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  activeType === type
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {type === 'NOTE' ? 'Notes' : 'Commands'}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEditNote(null); setModalOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} strokeWidth={1.5} />
            {activeType === 'NOTE' ? 'New Note' : 'New Command'}
          </button>
        </div>
      </div>

      {activeType === 'COMMAND' ? (
        <CommandsView
          commands={notes}
          isLoading={isLoading}
          onEdit={(n) => { setEditNote(n); setModalOpen(true) }}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <NoteList
            notes={notes}
            isLoading={isLoading}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            search={search}
            onSearchChange={setSearch}
            activeType={activeType}
          />
          <NoteViewer
            note={selected}
            onEdit={(n) => { setEditNote(n); setModalOpen(true) }}
          />
        </div>
      )}

      <AddNoteModal
        key={editNote?.id ?? 'new'}
        open={modalOpen || !!editNote}
        onClose={() => { setModalOpen(false); setEditNote(null) }}
        note={editNote ?? undefined}
        defaultType={activeType}
      />
    </div>
  )
}