'use client'
import { useState, useEffect } from 'react'
import type { RouterOutputs } from '@/lib/trpc'
import { api } from '@/lib/trpc'
import { Copy, Eye, EyeOff, Trash2, Check } from 'lucide-react'

type Credential = RouterOutputs['credentials']['list'][number]

const CATEGORY_LABELS: Record<string, string> = {
  API_KEY: 'API Key',
  DATABASE: 'Database',
  SERVICE: 'Service',
  SSH: 'SSH',
  OTHER: 'Other',
}

interface Props {
  credential: Credential
  masterPassword: string
  onDelete: (id: string) => void
}

export function CredentialCard({ credential, masterPassword, onDelete }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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

  return (
    <div className="bg-surface-1 border border-border-default rounded-md p-4 flex flex-col gap-3 hover:border-border-strong transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] font-medium text-text-primary">{credential.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-tertiary bg-surface-2 px-1.5 py-0.5 rounded">
              {CATEGORY_LABELS[credential.category]}
            </span>
            {credential.service && (
              <span className="text-[11px] text-text-ghost">{credential.service}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            if (deleteConfirm) onDelete(credential.id)
            else setDeleteConfirm(true)
          }}
          onBlur={() => setDeleteConfirm(false)}
          className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
            deleteConfirm
              ? 'text-red-500 opacity-100'
              : 'text-text-tertiary hover:text-red-500'
          }`}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>

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
                ? <Check size={13} strokeWidth={1.5} className="text-green-600" />
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

      {error && <p className="text-[11px] text-red-500">{error}</p>}

      {credential.lastCopiedAt && (
        <p className="text-[10px] text-text-ghost">
          Last copied {new Date(credential.lastCopiedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}