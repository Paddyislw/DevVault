'use client'
import { useState } from 'react'
import type { RouterOutputs } from '@/lib/trpc'
import { api } from '@/lib/trpc'
import { Trash2, Rocket, ArrowRight } from 'lucide-react'

type Idea = RouterOutputs['ideas']['list'][number]

const STATUS_CONFIG = {
  RAW:       { label: 'Raw',       classes: 'bg-surface-2 text-text-tertiary' },
  EXPLORING: { label: 'Exploring', classes: 'bg-blue-50 text-blue-600' },
  COMMITTED: { label: 'Committed', classes: 'bg-accent-subtle text-accent' },
  ABANDONED: { label: 'Abandoned', classes: 'bg-surface-2 text-text-ghost line-through' },
} as const

const STATUSES = ['RAW', 'EXPLORING', 'COMMITTED', 'ABANDONED'] as const

interface Props {
  idea: Idea
  onEdit: (idea: Idea) => void
}

export function IdeaCard({ idea, onEdit }: Props) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const utils = api.useUtils()

  const deleteIdea = api.ideas.delete.useMutation({
    onSettled: () => utils.ideas.list.invalidate(),
  })

  const updateStatus = api.ideas.update.useMutation({
    onSettled: () => utils.ideas.list.invalidate(),
  })

  const promote = api.ideas.promote.useMutation({
    onSettled: () => {
      utils.ideas.list.invalidate()
      utils.workspaces.list.invalidate()
    },
  })

  const isAbandoned = idea.status === 'ABANDONED'
  const isPromoted = !!idea.promotedToWorkspaceId

  return (
    <div className={`bg-surface-1 border border-border-default rounded-md p-4 flex flex-col gap-3 transition-colors group hover:border-border-strong ${isAbandoned ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className={`text-[14px] font-medium text-text-primary leading-snug flex-1 ${isAbandoned ? 'line-through text-text-tertiary' : ''}`}>
          {idea.title}
        </h3>
        <button
          onClick={() => {
            if (deleteConfirm) deleteIdea.mutate({ id: idea.id })
            else setDeleteConfirm(true)
          }}
          onBlur={() => setDeleteConfirm(false)}
          className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ${
            deleteConfirm ? 'text-red-500 opacity-100' : 'text-text-tertiary hover:text-red-500'
          }`}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>

      {/* Description */}
      {idea.description && (
        <p className="text-[12px] text-text-secondary leading-relaxed line-clamp-3">
          {idea.description}
        </p>
      )}

      {/* Tech stack */}
      {idea.techStack.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {idea.techStack.map(tech => (
            <span
              key={tech}
              className="text-[11px] bg-surface-2 text-text-secondary px-2 py-0.5 rounded"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle mt-auto">
        {/* Status picker */}
        <select
          value={idea.status}
          onChange={e => updateStatus.mutate({
            id: idea.id,
            status: e.target.value as typeof STATUSES[number]
          })}
          className={`text-[11px] px-2 py-0.5 rounded border-0 outline-none cursor-pointer ${STATUS_CONFIG[idea.status].classes}`}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {/* Promote button */}
        {!isAbandoned && (
          isPromoted ? (
            <span className="flex items-center gap-1 text-[11px] text-accent">
              <Rocket size={11} strokeWidth={1.5} />
              In workspace
            </span>
          ) : (
            <button
              onClick={() => promote.mutate({ id: idea.id })}
              disabled={promote.isPending}
              className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent transition-colors disabled:opacity-40"
            >
              <ArrowRight size={11} strokeWidth={1.5} />
              {promote.isPending ? 'Promoting...' : 'Promote'}
            </button>
          )
        )}
      </div>
    </div>
  )
}
