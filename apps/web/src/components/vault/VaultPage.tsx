'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import { VaultSetup } from './VaultSetup'
import { VaultLock } from './VaultLock'
import { CredentialList } from './CredentialList'
import { AddCredentialModal } from './AddCredentialModal'
import { PageHeader } from '@/components/shared/page-header'
import { Plus, Lock } from 'lucide-react'

export function VaultPage() {
  const [masterPassword, setMasterPassword] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | undefined>()

  const { data: passwordStatus, refetch } = api.credentials.hasMasterPassword.useQuery()
  const { data: credentials = [] } = api.credentials.list.useQuery(
    { category: activeCategory as any },
    { enabled: !!masterPassword }  // only fetch when unlocked
  )

  // Loading state
  if (!passwordStatus) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-48 h-4 animate-pulse rounded bg-surface-2" />
    </div>
  )

  // State 1 — no master password set yet
  if (!passwordStatus.hasPassword) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Vault" subtitle="Encrypted credential storage" />
        <VaultSetup onComplete={() => refetch()} />
      </div>
    )
  }

  // State 2 — locked
  if (!masterPassword) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Vault" subtitle="Encrypted credential storage" />
        <VaultLock onUnlock={(pwd) => setMasterPassword(pwd)} />
      </div>
    )
  }

  // State 3 — unlocked
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Vault"
        subtitle={`${credentials.length} credential${credentials.length !== 1 ? 's' : ''}`}
      >
        <button
          onClick={() => setMasterPassword(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary border border-border-default rounded transition-colors"
        >
          <Lock size={12} strokeWidth={1.5} />
          Lock
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={14} strokeWidth={1.5} />
          New Credential
        </button>
      </PageHeader>

      <CredentialList
        credentials={credentials}
        masterPassword={masterPassword}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <AddCredentialModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        masterPassword={masterPassword}
      />
    </div>
  )
}