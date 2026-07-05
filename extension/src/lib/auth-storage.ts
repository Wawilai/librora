interface StoredAuth {
  accessToken: string;
  accessTokenExpiresAt: number; // epoch ms
}

const KEY = "libroraAuth";
const storageArea = chrome.storage.session ?? chrome.storage.local;

export async function getStoredAuth(): Promise<StoredAuth | null> {
  const data = await storageArea.get(KEY);
  return (data[KEY] as StoredAuth | undefined) ?? null;
}

export async function setStoredAuth(auth: StoredAuth): Promise<void> {
  await storageArea.set({ [KEY]: auth });
}

export async function clearStoredAuth(): Promise<void> {
  await storageArea.remove(KEY);
}

export function isAccessTokenFresh(auth: StoredAuth): boolean {
  // Refresh a little before actual expiry to avoid racing a request against it.
  const SAFETY_MARGIN_MS = 15_000;
  return Date.now() < auth.accessTokenExpiresAt - SAFETY_MARGIN_MS;
}

export type { StoredAuth };
