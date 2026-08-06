"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/**
 * Alternative to the Telegram Login Widget for devices where you don't want
 * to link a personal Telegram session. Only works for accounts that already
 * signed in via Telegram once and set a password from Settings — see the
 * `password` provider in lib/auth.ts.
 */
export function PasswordLogin() {
  const [open, setOpen] = useState(false);
  const [telegramId, setTelegramId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleLogin() {
    setPending(true);
    setError(null);
    const res = await signIn("password", {
      telegramId,
      password,
      redirect: false,
    });
    setPending(false);
    if (!res || res.error) {
      setError("Invalid Telegram ID or password");
      return;
    }
    window.location.href = "/";
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full text-center text-[12px] text-text-tertiary transition-colors hover:text-text-primary"
      >
        Sign in with password instead
      </button>
    );
  }

  return (
    <div className="mt-6 border-t border-border-subtle pt-6">
      <p className="label mb-2 text-text-tertiary">Password login</p>
      <div className="flex flex-col gap-2">
        <input
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
          placeholder="Telegram ID"
          className="rounded border border-border-default bg-surface-0 px-2 py-1.5 text-sm text-text-primary transition-colors focus:border-border-strong focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          className="rounded border border-border-default bg-surface-0 px-2 py-1.5 text-sm text-text-primary transition-colors focus:border-border-strong focus:outline-none"
        />
        <button
          onClick={handleLogin}
          disabled={pending || !telegramId || !password}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
      <p className="mt-2 text-[12px] text-text-ghost">
        Only works if you&apos;ve already signed in with Telegram once and set
        a password in Settings.
      </p>
    </div>
  );
}
