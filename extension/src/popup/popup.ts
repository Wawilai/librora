import { checkExisting, createItem, ApiError, ensureSession } from "../lib/api";
import { WEB_ORIGIN } from "../lib/config";
import { clearStoredAuth } from "../lib/auth-storage";

const statusEl = document.getElementById("status")!;
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const saveLabel = document.getElementById("save-label")!;
const openLink = document.getElementById("open-link") as HTMLButtonElement;
const titleEl = document.getElementById("tab-title")!;
const domainEl = document.getElementById("tab-domain")!;
const noteEl = document.getElementById("note") as HTMLTextAreaElement;

let currentTabUrl: string | undefined;

function setStatus(text: string, tone: "pending" | "ok" | "error" = "pending") {
  statusEl.textContent = text;
  statusEl.className = tone === "pending" ? "status" : `status ${tone}`;
}

function setSaveState(label: string, disabled: boolean) {
  saveLabel.textContent = label;
  saveBtn.disabled = disabled;
}

function hostnameOf(url: string | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function getCurrentTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const tab = await getCurrentTab();
  currentTabUrl = tab?.url;
  titleEl.textContent = tab?.title?.trim() || "Untitled page";
  domainEl.textContent = hostnameOf(currentTabUrl);

  const session = await ensureSession();
  if (!session) {
    setStatus("Not connected. Open Librora and sign in.", "error");
    setSaveState("Save", true);
    return;
  }

  if (!currentTabUrl || !/^https?:\/\//.test(currentTabUrl)) {
    setStatus("This page can't be saved.", "error");
    setSaveState("Save", true);
    return;
  }

  try {
    const existing = await checkExisting(currentTabUrl);
    if (existing.exists) {
      setStatus("Already in your library.", "ok");
      setSaveState("Saved", true);
      return;
    }
    setStatus("");
    setSaveState("Save", false);
  } catch {
    setStatus("Couldn't reach Librora. Try again.", "error");
    setSaveState("Save", true);
  }
}

saveBtn.addEventListener("click", async () => {
  const url = currentTabUrl ?? (await getCurrentTab())?.url;
  if (!url) return;

  setSaveState("Saving...", true);
  setStatus("", "pending");
  try {
    await createItem(url, noteEl.value);
    setStatus("Saved to your library.", "ok");
    setSaveState("Saved", true);
  } catch (err) {
    if (err instanceof ApiError && err.code === "NOT_CONNECTED") {
      await clearStoredAuth();
      setStatus("Not connected. Open Librora and sign in.", "error");
      setSaveState("Save", true);
      return;
    }
    setStatus("Couldn't save this page. Try again.", "error");
    setSaveState("Save", false);
  }
});

openLink.addEventListener("click", () => {
  void chrome.tabs.create({ url: WEB_ORIGIN });
});

void init();
