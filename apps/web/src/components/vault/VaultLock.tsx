'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'

interface Props {
  onUnlock: (masterPassword: string) => void
}

export function VaultLock({ onUnlock }: Props) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const utils = api.useUtils()

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

  const resetVault = api.credentials.resetVault.useMutation({
    onSuccess: () => {
      // hasMasterPassword flips to false → VaultPage shows the setup screen
      utils.credentials.hasMasterPassword.invalidate()
      utils.credentials.list.invalidate()
    },
    onError: () => setError('Reset failed. Try again.'),
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

        {/* ── Forgot password / reset ── */}
        {!resetOpen ? (
          <button
            onClick={() => setResetOpen(true)}
            className="self-start text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Forgot your password?
          </button>
        ) : (
          <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={14} strokeWidth={1.5} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-red-600 leading-relaxed">
                <p className="font-medium">There is no way to recover the password.</p>
                <p className="mt-1">
                  Your credentials are encrypted with a key derived from it — without the
                  password they cannot be decrypted, by anyone. Resetting the vault
                  <strong> permanently deletes all saved credentials</strong> and lets you
                  start over with a new password.
                </p>
              </div>
            </div>

            <input
              value={resetConfirm}
              onChange={e => setResetConfirm(e.target.value)}
              placeholder='Type "RESET" to confirm'
              className="bg-white border border-red-200 rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost outline-none focus:border-red-400 transition-colors"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setResetOpen(false); setResetConfirm('') }}
                className="px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resetVault.mutate()}
                disabled={resetConfirm !== 'RESET' || resetVault.isPending}
                className="px-3 py-1.5 text-[12px] bg-red-500 text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resetVault.isPending ? 'Resetting…' : 'Delete everything & reset'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}