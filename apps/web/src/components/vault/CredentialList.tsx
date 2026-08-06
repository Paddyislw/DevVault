'use client'
import type { RouterOutputs } from '@/lib/trpc'
import { api } from '@/lib/trpc'
import { CredentialCard } from './CredentialCard'
import { EmptyState } from '@/components/shared/empty-state'
import { LayoutGrid, KeyRound, Database, Server, Terminal, FileText } from 'lucide-react'

type Credential = RouterOutputs['credentials']['list'][number]

const CATEGORIES = ['API_KEY', 'DATABASE', 'SERVICE', 'SSH', 'OTHER'] as const
const CATEGORY_LABELS: Record<string, string> = {
  API_KEY: 'API Keys',
  DATABASE: 'Databases',
  SERVICE: 'Services',
  SSH: 'SSH',
  OTHER: 'Other',
}
const CATEGORY_ICONS: Record<string, typeof KeyRound> = {
  API_KEY: KeyRound,
  DATABASE: Database,
  SERVICE: Server,
  SSH: Terminal,
  OTHER: FileText,
}

interface Props {
  credentials: Credential[]
  masterPassword: string
  activeCategory: string | undefined
  onCategoryChange: (c: string | undefined) => void
  onEdit: (credential: Credential) => void
}

export function CredentialList({ credentials, masterPassword, activeCategory, onCategoryChange, onEdit }: Props) {
  const utils = api.useUtils()

  const deleteCredential = api.credentials.delete.useMutation({
    onSettled: () => utils.credentials.list.invalidate(),
  })

  // Group by category
  const grouped = credentials.reduce((acc, cred) => {
    return { ...acc, [cred.category]: [...(acc[cred.category] ?? []), cred] }
  }, {} as Record<string, Credential[]>)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Category sidebar */}
      <div className="w-48 flex-shrink-0 border-r border-border-subtle py-4 flex flex-col gap-0.5 px-3">
        <p className="label text-text-ghost px-3 pb-2">Categories</p>
        <button
          onClick={() => onCategoryChange(undefined)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded text-[12px] transition-colors ${
            !activeCategory
              ? 'bg-surface-3 text-text-primary font-medium'
              : 'text-text-secondary hover:bg-surface-2'
          }`}
        >
          <LayoutGrid size={13} strokeWidth={1.5} className="flex-shrink-0" />
          <span className="flex-1 text-left">All</span>
          <span className="text-text-ghost">{credentials.length}</span>
        </button>
        {CATEGORIES.map(cat => {
          if (!grouped[cat]) return null
          const Icon = CATEGORY_ICONS[cat]
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat === activeCategory ? undefined : cat)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-[12px] transition-colors ${
                activeCategory === cat
                  ? 'bg-surface-3 text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-surface-2'
              }`}
            >
              <Icon size={13} strokeWidth={1.5} className="flex-shrink-0" />
              <span className="flex-1 text-left">{CATEGORY_LABELS[cat]}</span>
              <span className="text-text-ghost">{grouped[cat].length}</span>
            </button>
          )
        })}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {credentials.length === 0 ? (
          <EmptyState message="No credentials saved yet. Click New Credential to add one." />
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {credentials.map(cred => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                masterPassword={masterPassword}
                onEdit={onEdit}
                onDelete={(id) => deleteCredential.mutate({ id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}