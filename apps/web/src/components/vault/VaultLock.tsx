'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface Props {
  onUnlock: (masterPassword: string) => void
}

export function VaultLock({ onUnlock }: Props) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const verify = api.credentials.verifyMasterPassword.useMutation({
    onSuccess: (data) => {
      if (data.verified) {
        onUnlock(password)
      } else {
        setError('Wrong password. Try again.')
        setPassword('')
      }
    },
    onError: () => setError('Something went wrong. Try again.'),
  })

  function handleSubmit() {
    setError('')
    if (!password) return
    verify.mutate({ password })
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center mb-2">
            <Lock size={18} strokeWidth={1.5} className="text-text-secondary" />
          </div>
          <h2 className="font-display text-[22px] text-text-primary">Vault is locked</h2>
          <p className="text-[13px] text-text-secondary">
            Enter your master password to access your credentials.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center bg-surface-0 border border-border-default rounded px-3 py-2 focus-within:border-border-strong transition-colors">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Master password"
              autoFocus
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
            />
            <button
              onClick={() => setShowPassword(v => !v)}
              className="text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {showPassword
                ? <EyeOff size={14} strokeWidth={1.5} />
                : <Eye size={14} strokeWidth={1.5} />
              }
            </button>
          </div>

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={verify.isPending || !password}
            className="px-4 py-2 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {verify.isPending ? 'Unlocking...' : 'Unlock vault'}
          </button>
        </div>
      </div>
    </div>
  )
}