import { useEffect } from "react";

export function useGlobalShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable
      )
        return;
      const handler = handlers[e.key.toLowerCase()];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [handlers]);
}
