"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";

interface TelegramLoginProps {
  botName: string;
}

export function TelegramLogin({ botName }: TelegramLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Telegram calls this global function when user authenticates
    (window as any).onTelegramAuth = (user: Record<string, any>) => {
      // Convert all values to strings for NextAuth credentials
      const credentials: Record<string, string> = {};
      for (const [key, value] of Object.entries(user)) {
        credentials[key] = String(value);
      }
      signIn("telegram", { ...credentials, callbackUrl: "/" });
    };

    // Load the Telegram widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "6");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [botName]);

  return <div ref={containerRef} />;
}