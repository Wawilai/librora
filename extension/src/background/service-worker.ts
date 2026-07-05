import { setStoredAuth, type StoredAuth } from "../lib/auth-storage";

// ── Auth handoff from the web app ────────────────────────────────────────
// The only thing the background service worker still owns — the popup (see
// src/popup/popup.ts) now handles the click-to-save flow directly, since
// default_popup means chrome.action.onClicked never fires.

interface HandoffMessage {
  type: "PING" | "AUTH_HANDOFF";
  accessToken?: string;
  expiresIn?: number;
}

chrome.runtime.onMessageExternal.addListener((message: HandoffMessage, _sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "AUTH_HANDOFF") {
    const { accessToken, expiresIn } = message;
    if (!accessToken || !expiresIn) {
      sendResponse({ ok: false, error: "Malformed handoff payload" });
      return true;
    }
    const auth: StoredAuth = {
      accessToken,
      accessTokenExpiresAt: Date.now() + expiresIn * 1000,
    };
    setStoredAuth(auth)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true; // keep the message channel open for the async response
  }

  return false;
});
