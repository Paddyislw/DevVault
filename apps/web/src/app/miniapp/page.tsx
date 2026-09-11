"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { ListChecks, Lock } from "lucide-react";
import { MiniTasks } from "@/components/miniapp/MiniTasks";
import { MiniVault } from "@/components/miniapp/MiniVault";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        themeParams?: Record<string, string>;
      };
    };
  }
}

type Stage = "verifying" | "signing-in" | "ready" | "error";

function applyTelegramTheme(themeParams?: Record<string, string>) {
  if (!themeParams) return;
  const root = document.documentElement;
  if (themeParams.bg_color) root.style.setProperty("--surface-0", `#${themeParams.bg_color}`);
  if (themeParams.text_color) root.style.setProperty("--text-primary", `#${themeParams.text_color}`);
}

export default function MiniAppPage() {
  const { status } = useSession();
  const [stage, setStage] = useState<Stage>("verifying");
  const [tab, setTab] = useState<"tasks" | "vault">("tasks");
  const signInAttempted = useRef(false);

  // Load Telegram's WebApp runtime, then kick off sign-in once.
  useEffect(() => {
    if (status === "authenticated") {
      setStage("ready");
      return;
    }
    if (status !== "unauthenticated" || signInAttempted.current) return;

    const existing = window.Telegram?.WebApp;
    if (existing) {
      handleTelegramReady(existing);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp) {
        setStage("error");
        return;
      }
      handleTelegramReady(webApp);
    };
    script.onerror = () => setStage("error");
    document.head.appendChild(script);

    function handleTelegramReady(webApp: NonNullable<Window["Telegram"]>["WebApp"]) {
      if (!webApp) {
        setStage("error");
        return;
      }
      webApp.ready();
      webApp.expand();
      applyTelegramTheme(webApp.themeParams);

      if (!webApp.initData) {
        // Opened outside Telegram — nothing to sign in with.
        setStage("error");
        return;
      }

      if (signInAttempted.current) return;
      signInAttempted.current = true;
      setStage("signing-in");

      signIn("telegram-miniapp", { initData: webApp.initData, redirect: false }).then((res) => {
        if (!res || res.error) {
          setStage("error");
        }
        // On success, `status` flips to "authenticated" via useSession and
        // the effect above sets stage to "ready".
      });
    }
  }, [status]);

  if (stage === "error") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-0 px-6 text-center">
        <p className="text-sm text-text-secondary">
          Open this from the DevVault bot&apos;s menu button in Telegram.
        </p>
      </div>
    );
  }

  if (stage !== "ready") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-0">
        <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-surface-0">
      <div className="flex-1 overflow-y-auto">
        {tab === "tasks" ? <MiniTasks /> : <MiniVault />}
      </div>

      <div
        className="flex border-t border-border-subtle bg-surface-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          onClick={() => setTab("tasks")}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
            tab === "tasks" ? "text-accent" : "text-text-tertiary"
          }`}
        >
          <ListChecks size={20} strokeWidth={tab === "tasks" ? 2.25 : 1.5} />
          <span className="text-[11px] font-medium">Tasks</span>
        </button>
        <button
          onClick={() => setTab("vault")}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors ${
            tab === "vault" ? "text-accent" : "text-text-tertiary"
          }`}
        >
          <Lock size={20} strokeWidth={tab === "vault" ? 2.25 : 1.5} />
          <span className="text-[11px] font-medium">Vault</span>
        </button>
      </div>
    </div>
  );
}
