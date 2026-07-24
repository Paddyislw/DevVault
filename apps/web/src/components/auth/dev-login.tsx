"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

interface DevLoginProps {
  defaultTelegramId?: string;
}

/**
 * Dev-only bypass for the Telegram Login Widget, which can't render on
 * localhost (BotFather /setdomain won't accept it). The `dev` provider that
 * backs this only exists when NODE_ENV=development and DEV_LOGIN=true.
 */
export function DevLogin({ defaultTelegramId = "" }: DevLoginProps) {
  const [telegramId, setTelegramId] = useState(defaultTelegramId);
  const [pending, setPending] = useState(false);

  const handleLogin = async () => {
    setPending(true);
    await signIn("dev", { telegramId, callbackUrl: "/" });
    setPending(false);
  };

  return (
    <div className="mt-6 border-t border-border-subtle pt-6">
      <p className="label mb-2 text-text-tertiary">Dev login</p>
      <div className="flex gap-2">
        <input
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
          placeholder="telegram id"
          className="flex-1 rounded border border-border-default bg-surface-0 px-2 py-1.5 text-sm text-text-primary transition-colors focus:border-border-strong focus:outline-none"
        />
        <button
          onClick={handleLogin}
          disabled={pending}
          className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sign in
        </button>
      </div>
      <p className="mt-2 text-[12px] text-text-ghost">
        Skips Telegram hash verification. Local only.
      </p>
    </div>
  );
}
