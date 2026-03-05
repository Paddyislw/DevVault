'use client'
import type { RouterOutputs } from '@/lib/trpc'
import { api } from '@/lib/trpc'
import { CredentialCard } from './CredentialCard'

type Credential = RouterOutputs['credentials']['list'][number]

const CATEGORIES = ['API_KEY', 'DATABASE', 'SERVICE', 'SSH', 'OTHER'] as const
const CATEGORY_LABELS: Record<string, string> = {
  API_KEY: 'API Keys',
  DATABASE: 'Databases',
  SERVICE: 'Services',
  SSH: 'SSH',
  OTHER: 'Other',
}

interface Props {
  credentials: Credential[]
  masterPassword: string
  activeCategory: string | undefined
  onCategoryChange: (c: string | undefined) => void
}

export function CredentialList({ credentials, masterPassword, activeCategory, onCategoryChange }: Props) {
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
      <div className="w-44 flex-shrink-0 border-r border-border-default py-3 flex flex-col gap-0.5 px-2">
        <button
          onClick={() => onCategoryChange(undefined)}
          className={`w-full text-left px-3 py-2 rounded text-[12px] transition-colors ${
            !activeCategory
              ? 'bg-surface-3 text-text-primary font-medium'
              : 'text-text-secondary hover:bg-surface-2'
          }`}
        >
          All
          <span className="float-right text-text-ghost">{credentials.length}</span>
        </button>
        {CATEGORIES.map(cat => (
          grouped[cat] ? (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat === activeCategory ? undefined : cat)}
              className={`w-full text-left px-3 py-2 rounded text-[12px] transition-colors ${
                activeCategory === cat
                  ? 'bg-surface-3 text-text-primary font-medium'
                  : 'text-text-secondary hover:bg-surface-2'
              }`}
            >
              {CATEGORY_LABELS[cat]}
              <span className="float-right text-text-ghost">{grouped[cat].length}</span>
            </button>
          ) : null
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {credentials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <p className="text-[13px] text-text-secondary">No credentials saved yet.</p>
            <p className="text-[12px] text-text-ghost">Click New Credential to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {credentials.map(cred => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                masterPassword={masterPassword}
                onDelete={(id) => deleteCredential.mutate({ id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}