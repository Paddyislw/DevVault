'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import type { RouterOutputs } from '@/lib/trpc'
import { IdeaCard } from './IdeaCard'
import { AddIdeaModal } from './AddIdeaModal'
import { PageHeader } from '@/components/shared/page-header'
import { Plus } from 'lucide-react'

type Idea = RouterOutputs['ideas']['list'][number]
type IdeaStatus = 'RAW' | 'EXPLORING' | 'COMMITTED' | 'ABANDONED'

const STATUS_TABS: { value: IdeaStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'RAW', label: 'Raw' },
  { value: 'EXPLORING', label: 'Exploring' },
  { value: 'COMMITTED', label: 'Committed' },
  { value: 'ABANDONED', label: 'Abandoned' },
]

export function IdeasPage() {
  const [activeTab, setActiveTab] = useState<IdeaStatus | 'ALL'>('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [editIdea, setEditIdea] = useState<Idea | null>(null)

  const { data: allIdeas = [], isLoading } = api.ideas.list.useQuery({})

  const ideas = activeTab === 'ALL'
    ? allIdeas
    : allIdeas.filter(i => i.status === activeTab)

  const counts = allIdeas.reduce((acc, idea) => ({
    ...acc, [idea.status]: (acc[idea.status] ?? 0) + 1
  }), {} as Record<string, number>)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Ideas"
        subtitle={`${allIdeas.length} idea${allIdeas.length !== 1 ? 's' : ''}`}
      >
        <button
          onClick={() => { setEditIdea(null); setModalOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} strokeWidth={1.5} />
          New Idea
        </button>
      </PageHeader>

      {/* Status tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-border-subtle">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] transition-colors ${
              activeTab === tab.value
                ? 'bg-surface-3 text-text-primary font-medium'
                : 'text-text-secondary hover:bg-surface-2'
            }`}
          >
            {tab.label}
            {tab.value !== 'ALL' && counts[tab.value] ? (
              <span className="text-text-ghost">{counts[tab.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-40 animate-pulse rounded-md bg-surface-2" style={{ opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <p className="text-[13px] text-text-secondary">
              {activeTab === 'ALL' ? 'No ideas yet.' : `No ${activeTab.toLowerCase()} ideas.`}
            </p>
            <p className="text-[12px] text-text-ghost">
              {activeTab === 'ALL' ? 'Capture your next project idea.' : ''}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {ideas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onEdit={setEditIdea}
              />
            ))}
          </div>
        )}
      </div>

      <AddIdeaModal
        key={editIdea?.id ?? 'new'}
        open={modalOpen || !!editIdea}
        onClose={() => { setModalOpen(false); setEditIdea(null) }}
        idea={editIdea ?? undefined}
      />
    </div>
  )
}
