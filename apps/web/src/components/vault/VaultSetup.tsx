'use client'
import { useState } from 'react'
import { api } from '@/lib/trpc'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface Props {
  onComplete: () => void
}

export function VaultSetup({ onComplete }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const setMasterPassword = api.credentials.setMasterPassword.useMutation({
    onSuccess: () => onComplete(),
    onError: (e: { message: string }) => setError(e.message),
  })

  function handleSubmit() {
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setMasterPassword.mutate({ password })
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center mb-2">
            <Lock size={18} strokeWidth={1.5} className="text-text-secondary" />
          </div>
          <h2 className="font-display text-[22px] text-text-primary">Set up your vault</h2>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Choose a master password to encrypt your credentials.
            This password is never stored — if you forget it, your credentials cannot be recovered.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="label text-text-tertiary">Master password</label>
            <div className="flex items-center bg-surface-0 border border-border-default rounded px-3 py-2 focus-within:border-border-strong transition-colors">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label text-text-tertiary">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Repeat password"
              className="bg-surface-0 border border-border-default rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-border-strong transition-colors"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={setMasterPassword.isPending}
            className="px-4 py-2 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {setMasterPassword.isPending ? 'Setting up...' : 'Create vault'}
          </button>
        </div>

        <p className="text-[11px] text-text-ghost leading-relaxed">
          Your credentials are encrypted with AES-256-GCM. The master password never leaves your device unencrypted.
        </p>
      </div>
    </div>
  )
}