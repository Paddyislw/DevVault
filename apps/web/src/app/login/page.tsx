import { TelegramLogin } from "@/components/auth/telegram-login";

export default function LoginPage() {
  console.log('NEXT_PUBLIC_BOT_USERNAME',process.env.NEXT_PUBLIC_BOT_USERNAME)
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0">
      <div className="w-full max-w-sm px-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
            D
          </div>
          <h1 className="text-lg font-semibold text-text-primary">
            Welcome to DevVault
          </h1>
          <p className="mt-1 text-[13px] text-text-tertiary">
            Sign in with your Telegram account
          </p>
        </div>

        {/* Telegram widget */}
        <div className="flex justify-center">
          <TelegramLogin botName={process.env.NEXT_PUBLIC_BOT_USERNAME!} />
        </div>

        <p className="mt-8 text-center text-[12px] text-text-ghost">
          Your bot data syncs automatically with the dashboard.
        </p>
      </div>
    </div>
  );
}