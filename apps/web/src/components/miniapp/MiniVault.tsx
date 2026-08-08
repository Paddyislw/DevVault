"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { Lock, Copy, Check, Eye, EyeOff } from "lucide-react";

function VaultLockGate({ onUnlock }: { onUnlock: (password: string) => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const verify = api.credentials.verifyMasterPassword.useMutation({
    onSuccess: (data) => {
      if (data.verified) {
        onUnlock(password);
      } else {
        setError("Wrong password.");
        setPassword("");
      }
    },
    onError: () => setError("Something went wrong."),
  });

  function handleSubmit() {
    setError("");
    if (!password) return;
    verify.mutate({ password });
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 pt-16 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-default bg-surface-2">
        <Lock size={18} strokeWidth={1.5} className="text-text-secondary" />
      </div>
      <p className="text-sm text-text-secondary">Enter your master password to unlock the vault.</p>
      <div className="flex w-full max-w-xs items-center rounded-md border border-border-default bg-surface-1 px-3 py-2">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Master password"
          autoFocus
          className="flex-1 bg-transparent text-sm text-text-primary outline-none"
        />
        <button onClick={() => setShowPassword((v) => !v)} className="text-text-tertiary">
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={verify.isPending || !password}
        className="w-full max-w-xs rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {verify.isPending ? "Unlocking..." : "Unlock"}
      </button>
    </div>
  );
}

function CredentialRow({
  credential,
  masterPassword,
}: {
  credential: { id: string; name: string; service: string | null };
  masterPassword: string;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reveal = api.credentials.reveal.useMutation({
    onSuccess: (data) => setRevealed(data.value),
  });

  async function handleCopy() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-surface-1 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-text-primary">{credential.name}</p>
          {credential.service && (
            <p className="truncate text-xs text-text-tertiary">{credential.service}</p>
          )}
        </div>
        {!revealed && (
          <button
            onClick={() => reveal.mutate({ id: credential.id, masterPassword })}
            disabled={reveal.isPending}
            className="flex-shrink-0 rounded-md border border-border-default px-2.5 py-1 text-xs text-text-secondary"
          >
            {reveal.isPending ? "..." : "Reveal"}
          </button>
        )}
      </div>
      {revealed && (
        <div className="flex items-center gap-2 rounded bg-surface-0 px-2 py-1.5">
          <code className="flex-1 truncate text-xs text-text-primary">{revealed}</code>
          <button onClick={handleCopy} className="flex-shrink-0 text-text-tertiary">
            {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}

export function MiniVault() {
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const { data: passwordStatus } = api.credentials.hasMasterPassword.useQuery();
  const { data: credentials = [], isLoading } = api.credentials.list.useQuery(
    {},
    { enabled: !!masterPassword },
  );

  if (!passwordStatus) {
    return <div className="p-6"><div className="h-4 w-32 animate-pulse rounded bg-surface-2" /></div>;
  }

  if (!passwordStatus.hasPassword) {
    return (
      <p className="p-6 pt-16 text-center text-sm text-text-tertiary">
        No master password set yet — set one up from the dashboard on desktop first.
      </p>
    );
  }

  if (!masterPassword) {
    return <VaultLockGate onUnlock={setMasterPassword} />;
  }

  return (
    <div className="flex flex-col gap-1.5 p-4">
      {isLoading ? (
        [1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-md bg-surface-2" />)
      ) : credentials.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">No credentials saved yet.</p>
      ) : (
        credentials.map((c) => (
          <CredentialRow key={c.id} credential={c} masterPassword={masterPassword} />
        ))
      )}
    </div>
  );
}
