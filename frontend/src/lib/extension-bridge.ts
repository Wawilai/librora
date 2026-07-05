/**
 * Bridge for handing an authenticated session off to the Library Clipper
 * browser extension, if installed. Uses `externally_connectable` +
 * `chrome.runtime.sendMessage` — the extension's manifest allowlists this
 * web app's origin, so no content script is needed on either side.
 *
 * The frontend doesn't depend on @types/chrome (it's not a browser-extension
 * project), so the narrow slice of the chrome.* API used here is typed locally.
 */

interface ChromeRuntimeLike {
  lastError?: { message?: string };
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void,
  ) => void;
}

// Must be a static, direct property access — Vite's SSR module runner can't
// statically analyze dynamic/indirect access to import.meta.env and throws
// at request time, silently downgrading the whole app to client-only render.
const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID;

/* eslint-disable @typescript-eslint/no-explicit-any */
// Resolved fresh on every call rather than captured once at module scope —
// `chrome.runtime` for an `externally_connectable` origin can become available
// slightly after the page's own module graph has already evaluated.
function getChromeRuntime(): ChromeRuntimeLike | undefined {
  return (globalThis as any)?.chrome?.runtime as ChromeRuntimeLike | undefined;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function sendMessage<T>(message: unknown): Promise<T | undefined> {
  return new Promise((resolve) => {
    const chromeRuntime = getChromeRuntime();
    if (!chromeRuntime || typeof chromeRuntime.sendMessage !== "function" || !EXTENSION_ID) {
      resolve(undefined);
      return;
    }
    try {
      chromeRuntime.sendMessage(EXTENSION_ID, message, (response) => {
        // chromeRuntime.lastError is set (not thrown) when no extension with
        // this ID is installed/listening — this is the expected common case.
        if (chromeRuntime.lastError) {
          resolve(undefined);
          return;
        }
        resolve(response as T);
      });
    } catch {
      resolve(undefined);
    }
  });
}

export async function pingExtension(): Promise<boolean> {
  const res = await sendMessage<{ ok: boolean }>({ type: "PING" });
  return res?.ok === true;
}

export async function handoffToExtension(tokens: {
  accessToken: string;
  expiresIn: number;
}): Promise<boolean> {
  const res = await sendMessage<{ ok: boolean }>({
    type: "AUTH_HANDOFF",
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
  });
  return res?.ok === true;
}
