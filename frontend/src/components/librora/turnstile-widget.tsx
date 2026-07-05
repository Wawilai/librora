import { useEffect, useRef } from "react";

// Must be a static, direct property access — Vite's SSR module runner can't
// statically analyze dynamic/indirect access to import.meta.env and throws
// at request time (see extension-bridge.ts for the same constraint).
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

// Callers use this to decide whether to gate a submit button on the widget
// having produced a token — if no site key is configured, the widget never
// renders and a token will never arrive, so gating on it would permanently
// disable the button in local dev.
export const isTurnstileConfigured = !!SITE_KEY;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

// Renders nothing if VITE_TURNSTILE_SITE_KEY isn't configured — matches the
// backend's graceful-skip behavior (see TurnstileService) so local dev works
// with neither side configured.
export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: onVerify,
        });
      })
      .catch(() => null);

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // onVerify is expected to be stable (or the caller accepts a re-render
    // remounting the widget) — re-running on every render would re-render
    // the widget in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} />;
}
