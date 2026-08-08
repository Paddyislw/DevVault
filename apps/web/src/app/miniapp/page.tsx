"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
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
        <div className="h-6 w-6 animate-pulse rounded-full bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-surface-0">
      <div className="flex-1 overflow-y-auto">
        {tab === "tasks" ? <MiniTasks /> : <MiniVault />}
      </div>

      <div className="flex border-t border-border-subtle">
        <button
          onClick={() => setTab("tasks")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === "tasks" ? "text-accent" : "text-text-tertiary"
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setTab("vault")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            tab === "vault" ? "text-accent" : "text-text-tertiary"
          }`}
        >
          Vault
        </button>
      </div>
    </div>
  );
}
