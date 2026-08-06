'use client'
import { useState, useEffect } from 'react'
import type { RouterOutputs } from '@/lib/trpc'
import { api } from '@/lib/trpc'
import { Copy, Eye, EyeOff, Trash2, Check, Pencil, KeyRound, Database, Server, Terminal, FileText } from 'lucide-react'

type Credential = RouterOutputs['credentials']['list'][number]

const CATEGORY_LABELS: Record<string, string> = {
  API_KEY: 'API Key',
  DATABASE: 'Database',
  SERVICE: 'Service',
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
  credential: Credential
  masterPassword: string
  onEdit: (credential: Credential) => void
  onDelete: (id: string) => void
}

export function CredentialCard({ credential, masterPassword, onEdit, onDelete }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [usernameCopied, setUsernameCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [error, setError] = useState('')

  const reveal = api.credentials.reveal.useMutation({
    onSuccess: (data) => {
      setRevealed(data.value)
      setTimeLeft(30)
    },
    onError: () => setError('Wrong password or decryption failed'),
  })

  // 30s auto-clear countdown
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft === 0) {
      setRevealed(null)
      setTimeLeft(null)
      return
    }
    const timer = setTimeout(() => setTimeLeft(t => (t ?? 1) - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft])

  function handleReveal() {
    setError('')
    if (revealed) {
      setRevealed(null)
      setTimeLeft(null)
      return
    }
    reveal.mutate({ id: credential.id, masterPassword })
  }

  function handleCopy() {
    if (!revealed) return
    navigator.clipboard.writeText(revealed)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyUsername() {
    if (!credential.username) return
    navigator.clipboard.writeText(credential.username)
    setUsernameCopied(true)
    setTimeout(() => setUsernameCopied(false), 2000)
  }

  const Icon = CATEGORY_ICONS[credential.category] ?? FileText

  return (
    <div className="bg-surface-1 border border-border-default rounded-md p-4 flex flex-col gap-3 card-hover hover:border-border-strong transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-accent-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon size={13} strokeWidth={1.5} className="text-accent" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[13px] font-medium text-text-primary truncate">{credential.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded">
                {CATEGORY_LABELS[credential.category]}
              </span>
              {credential.service && (
                <span className="text-[11px] text-text-ghost truncate">{credential.service}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(credential)}
            className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
            title="Edit"
          >
            <Pencil size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => {
              if (deleteConfirm) onDelete(credential.id)
              else setDeleteConfirm(true)
            }}
            onBlur={() => setDeleteConfirm(false)}
            className={`p-1 rounded transition-colors ${
              deleteConfirm
                ? 'text-danger opacity-100'
                : 'text-text-tertiary hover:text-danger'
            }`}
            title={deleteConfirm ? 'Click again to confirm' : 'Delete'}
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Username row — plaintext, no reveal needed */}
      {credential.username && (
        <div className="flex items-center gap-2 bg-surface-0 border border-border-subtle rounded px-3 py-1.5">
          <span className="flex-1 font-mono text-[12px] text-text-secondary truncate">
            {credential.username}
          </span>
          <button
            onClick={handleCopyUsername}
            className="p-0.5 text-text-tertiary hover:text-text-primary transition-colors rounded flex-shrink-0"
            title="Copy username"
          >
            {usernameCopied
              ? <Check size={12} strokeWidth={1.5} className="text-success" />
              : <Copy size={12} strokeWidth={1.5} />
            }
          </button>
        </div>
      )}

      {/* Value row */}
      <div className="flex items-center gap-2 bg-surface-0 border border-border-subtle rounded px-3 py-2">
        <code className="flex-1 font-mono text-[12px] text-text-primary truncate">
          {revealed ? revealed : '••••••••••••••••'}
        </code>
        <div className="flex items-center gap-1 flex-shrink-0">
          {revealed && timeLeft !== null && (
            <span className="text-[10px] text-text-ghost w-6 text-right">{timeLeft}s</span>
          )}
          {revealed && (
            <button
              onClick={handleCopy}
              className="p-1 text-text-tertiary hover:text-text-primary transition-colors rounded"
            >
              {copied
                ? <Check size={13} strokeWidth={1.5} className="text-success" />
                : <Copy size={13} strokeWidth={1.5} />
              }
            </button>
          )}
          <button
            onClick={handleReveal}
            disabled={reveal.isPending}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors rounded disabled:opacity-40"
          >
            {revealed
              ? <EyeOff size={13} strokeWidth={1.5} />
              : <Eye size={13} strokeWidth={1.5} />
            }
          </button>
        </div>
      </div>

      {error && <p className="text-[11px] text-danger">{error}</p>}

      {credential.notes && (
        <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2">{credential.notes}</p>
      )}

      {credential.lastCopiedAt && (
        <p className="text-[10px] text-text-ghost">
          Last copied {new Date(credential.lastCopiedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
