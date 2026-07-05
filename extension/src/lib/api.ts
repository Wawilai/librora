import { API_BASE } from "./config";
import { clearStoredAuth, getStoredAuth, isAccessTokenFresh, type StoredAuth } from "./auth-storage";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface LibraryItem {
  id: string;
  url: string;
}

async function rawRequest<T>(
  method: string,
  path: string,
  body: unknown,
  accessToken: string | null,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as
    | { data: T }
    | { error: { code: string; message: string } };

  if (!res.ok) {
    const err = (json as { error: { code: string; message: string } }).error;
    throw new ApiError(err?.code ?? "UNKNOWN", err?.message ?? "Request failed");
  }

  return (json as { data: T }).data;
}

/** Returns the current extension session, or clears it once the short-lived
 * access token expires. Reconnect from the web app to mint a new one. */
export async function ensureSession(): Promise<StoredAuth | null> {
  const stored = await getStoredAuth();
  if (!stored) return null;
  if (isAccessTokenFresh(stored)) return stored;
  await clearStoredAuth();
  return null;
}

export async function checkExisting(
  url: string,
): Promise<{ exists: true; item: LibraryItem } | { exists: false }> {
  const auth = await ensureSession();
  if (!auth) throw new ApiError("NOT_CONNECTED", "No extension session");
  return rawRequest("POST", "/items/check-existing", { url }, auth.accessToken);
}

export async function createItem(url: string, note?: string): Promise<LibraryItem> {
  const auth = await ensureSession();
  if (!auth) throw new ApiError("NOT_CONNECTED", "No extension session");
  return rawRequest("POST", "/items", { url, ...(note?.trim() ? { note: note.trim() } : {}) }, auth.accessToken);
}
