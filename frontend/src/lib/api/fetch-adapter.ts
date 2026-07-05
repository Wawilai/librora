/**
 * fetchAdapter — production implementation of ApiClient backed by the real NestJS API.
 *
 * Data mapping notes:
 * - Backend enums are UPPERCASE (PENDING, READY, FREE, PREMIUM).
 *   Frontend types are lowercase (pending, ready, free, premium).
 * - Backend tags are objects [{tag, source}] on GET item, string arrays on POST/PATCH.
 *   We normalise to string[] everywhere.
 * - Access token is stored in module-level memory (not localStorage) and sent as
 *   Authorization header. Refresh token lives in an HttpOnly cookie managed by the
 *   browser — never touched here.
 */

import type { ApiClient } from "./client";
import type {
  BookshelfDef,
  BookshelfRule,
  ItemStatus,
  LibraryItem,
  MockUser,
  PlanTier,
  PlanUsage,
} from "./types";
import { ApiError, type ApiErrorCode } from "./types";

// ── Config ──────────────────────────────────────────────────────────────────

// Must be a static, direct property access (import.meta.env.VITE_API_URL) —
// Vite's SSR module runner cannot statically analyze dynamic/indirect access
// (e.g. via a cast through `any` or bracket notation) and throws at request
// time, silently downgrading the whole app to client-only rendering.
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// Access token kept in memory only — never touches localStorage.
let accessToken: string | null = null;

// Dedupes concurrent refresh attempts on first authenticated call after a full
// page load (module state resets on reload, but the refresh-token cookie survives).
let refreshInFlight: Promise<void> | null = null;

async function ensureAccessToken(): Promise<void> {
  if (accessToken) return;
  if (!refreshInFlight) {
    refreshInFlight = request<{ accessToken: string }>("POST", "/auth/refresh", undefined, true)
      .then((data) => {
        accessToken = data.accessToken;
      })
      .catch(() => {
        // No valid refresh cookie — caller's request will fail with 401 as normal.
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  await refreshInFlight;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  skipAuth = false,
): Promise<T> {
  if (!skipAuth) await ensureAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!skipAuth && accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1${path}`, {
      method,
      headers,
      credentials: "include", // send refresh token cookie
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({
      code: "RATE_LIMIT_EXCEEDED" as ApiErrorCode, // closest network-error code
      httpStatus: 0,
      message: "เชื่อมต่อเครือข่ายไม่สำเร็จ ลองอีกครั้ง",
    });
  }

  // 204 No Content — return empty
  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as
    | { data: T; meta: unknown }
    | { error: { code: string; message: string; details: unknown }; meta: { requestId: string } };

  if (!res.ok) {
    const err = (
      json as {
        error: { code: string; message: string; details: unknown };
        meta: { requestId: string };
      }
    ).error;
    throw new ApiError({
      code: (err.code as ApiErrorCode) ?? "VALIDATION_ERROR",
      httpStatus: res.status,
      message: err.message ?? "เกิดข้อผิดพลาด",
      details: err.details,
      requestId: (json as { meta: { requestId: string } }).meta?.requestId,
    });
  }

  return (json as { data: T }).data;
}

// Binary responses (file downloads) can't go through request<T>()'s JSON
// parsing — same auth/error handling, but resolves to a Blob on success.
async function requestBlob(method: string, path: string, body?: unknown): Promise<Blob> {
  await ensureAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/v1${path}`, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({
      code: "RATE_LIMIT_EXCEEDED" as ApiErrorCode,
      httpStatus: 0,
      message: "เชื่อมต่อเครือข่ายไม่สำเร็จ ลองอีกครั้ง",
    });
  }

  if (!res.ok) {
    const json = (await res.json()) as {
      error: { code: string; message: string; details: unknown };
      meta: { requestId: string };
    };
    throw new ApiError({
      code: (json.error.code as ApiErrorCode) ?? "VALIDATION_ERROR",
      httpStatus: res.status,
      message: json.error.message ?? "เกิดข้อผิดพลาด",
      details: json.error.details,
      requestId: json.meta?.requestId,
    });
  }

  return res.blob();
}

// ── Data mappers ─────────────────────────────────────────────────────────────

function mapStatus(s: string): ItemStatus {
  const map: Record<string, ItemStatus> = {
    PENDING: "pending",
    PROCESSING: "processing",
    READY: "ready",
    PARTIAL: "partial",
    FAILED: "failed",
  };
  return map[s] ?? "pending";
}

function mapPlan(p: string): PlanTier {
  return p === "PREMIUM" ? "premium" : "free";
}

function mapSourceType(s: unknown): "article" | "google_doc" {
  return s === "GOOGLE_DOC" ? "google_doc" : "article";
}

// Backend tag objects or strings → string[]
function mapTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => (typeof t === "string" ? t : ((t as { tag: string }).tag ?? "")));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItem(raw: any): LibraryItem {
  return {
    id: raw.id,
    url: raw.url,
    domain: raw.domain ?? new URL(raw.url).hostname.replace(/^www\./, ""),
    title: raw.title ?? raw.extractedTitle ?? raw.url,
    extractedTitle: raw.extractedTitle ?? undefined,
    description: raw.description ?? undefined,
    faviconLetter: (raw.domain?.[0] ?? raw.url[0] ?? "?").toUpperCase(),
    status: mapStatus(raw.status),
    sourceType: mapSourceType(raw.sourceType),
    bookshelf: raw.bookshelf ?? undefined,
    bookshelfSource:
      raw.bookshelfSource === "MANUAL"
        ? "manual"
        : raw.bookshelfSource === "AUTO"
          ? "auto"
          : undefined,
    tags: mapTags(raw.tags),
    aiAbstract: raw.aiAbstract ?? undefined,
    readableContent: raw.readableContent ?? undefined,
    personalNote: raw.personalNote ?? undefined,
    inReadingList: raw.inReadingList ?? false,
    archived: raw.archived ?? false,
    addedAt: raw.addedAt,
    processedAt: raw.processedAt ?? undefined,
    failureReason: raw.failureReason ?? undefined,
    partialReason: raw.partialReason ?? undefined,
    language: raw.language ?? undefined,
    author: raw.author ?? undefined,
    publishedDate: raw.publishedDate ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(raw: any): MockUser {
  const email: string = raw.email ?? "";
  const name: string = raw.displayName ?? email.split("@")[0] ?? "Reader";
  return {
    id: raw.id,
    email,
    displayName: name,
    plan: mapPlan(raw.currentPlan ?? "FREE"),
    initials: name.slice(0, 1).toUpperCase() || "R",
  };
}

// Bookshelves come from the API; backend owns the static definitions.

function mapBookshelf(raw: unknown): BookshelfDef {
  const shelf = raw as { slug: string; label: string; description?: string; itemCount?: number };
  return {
    slug: shelf.slug as BookshelfDef["slug"],
    label: shelf.label,
    description: shelf.description ?? "",
    ...(shelf.itemCount !== undefined ? { itemCount: shelf.itemCount } : {}),
  };
}

// ── Adapter ──────────────────────────────────────────────────────────────────

export const fetchAdapter: ApiClient = {
  items: {
    async list(params) {
      const query = new URLSearchParams();
      if (params?.bookshelf) query.set("bookshelf", params.bookshelf);
      if (params?.archived !== undefined) query.set("archived", String(params.archived));
      if (params?.readingList !== undefined) query.set("readingList", String(params.readingList));
      if (params?.limit !== undefined) query.set("limit", String(params.limit));
      const suffix = query.size ? `?${query.toString()}` : "";
      const data = await request<{ items: unknown[]; total: number }>("GET", `/items${suffix}`);
      return data.items.map(mapItem);
    },

    async get(id) {
      const data = await request<unknown>("GET", `/items/${id}`);
      return mapItem(data);
    },

    async create({ url, customTitle, note, tags }) {
      const data = await request<unknown>("POST", "/items", {
        url,
        ...(customTitle ? { customTitle } : {}),
        ...(note ? { note } : {}),
        ...(tags?.length ? { tags } : {}),
      });
      return mapItem(data);
    },

    async checkExisting(url) {
      const data = await request<{ exists: boolean; item?: unknown }>(
        "POST",
        "/items/check-existing",
        {
          url,
        },
      );
      return data.exists && data.item
        ? { exists: true, item: mapItem(data.item) }
        : { exists: false };
    },

    async update(id, patch) {
      const data = await request<unknown>("PATCH", `/items/${id}`, {
        ...(patch.title !== undefined ? { customTitle: patch.title } : {}),
        ...(patch.bookshelf !== undefined ? { bookshelf: patch.bookshelf } : {}),
      });
      return mapItem(data);
    },

    async setNote(id, note) {
      const data = await request<unknown>("PATCH", `/items/${id}/note`, { note });
      return mapItem(data);
    },

    async toggleReadingList(id) {
      // Fetch current state first to know which direction to toggle
      const current = await request<unknown>("GET", `/items/${id}`);
      const item = mapItem(current);
      if (item.inReadingList) {
        const data = await request<unknown>("DELETE", `/items/${id}/reading-list`);
        return mapItem(data);
      } else {
        const data = await request<unknown>("PUT", `/items/${id}/reading-list`);
        return mapItem(data);
      }
    },

    async archive(id) {
      const data = await request<unknown>("PUT", `/items/${id}/archive`);
      return mapItem(data);
    },

    async restore(id) {
      const data = await request<unknown>("DELETE", `/items/${id}/archive`);
      return mapItem(data);
    },

    async remove(id) {
      await request<void>("DELETE", `/items/${id}`);
    },

    async reprocess(id) {
      const data = await request<unknown>("POST", `/items/${id}/reprocess`);
      return mapItem(data);
    },

    async retry(id) {
      // retry = reprocess in the real API
      const data = await request<unknown>("POST", `/items/${id}/reprocess`);
      return mapItem(data);
    },

    async exportOne(id, format) {
      return requestBlob("GET", `/items/${id}/export?format=${format}`);
    },

    async exportBulk(format, filter) {
      return requestBlob("POST", `/items/export?format=${format}`, filter ?? {});
    },
  },

  bookshelves: {
    async list() {
      const data = await request<unknown[]>("GET", "/bookshelves");
      return data.map(mapBookshelf);
    },
  },

  bookshelfRules: {
    async list() {
      return request<BookshelfRule[]>("GET", "/bookshelf-rules");
    },
    async create(input) {
      return request<BookshelfRule>("POST", "/bookshelf-rules", input);
    },
    async update(id, patch) {
      return request<BookshelfRule>("PATCH", `/bookshelf-rules/${id}`, patch);
    },
    async remove(id) {
      await request<void>("DELETE", `/bookshelf-rules/${id}`);
    },
    async applyNow(id) {
      return request<{ queued: true }>("POST", `/bookshelf-rules/${id}/apply`);
    },
  },

  tags: {
    async rename(oldTag, newTag) {
      await request<void>("PATCH", `/tags/${encodeURIComponent(oldTag)}`, { newTag });
    },

    async remove(tag) {
      await request<void>("DELETE", `/tags/${encodeURIComponent(tag)}`);
    },
  },

  search: {
    async keyword(q, limit) {
      const params = new URLSearchParams({ q });
      if (limit !== undefined) params.set("limit", String(limit));
      const data = await request<{ items: unknown[]; total: number }>(
        "GET",
        `/search/keyword?${params.toString()}`,
      );
      return { items: data.items.map(mapItem), total: data.total };
    },

    async semantic(q, limit) {
      const data = await request<{ items: unknown[]; total: number; scores: number[] }>(
        "POST",
        "/search/semantic",
        { q, ...(limit !== undefined ? { limit } : {}) },
      );
      return { items: data.items.map(mapItem), total: data.total, scores: data.scores };
    },
  },

  users: {
    async updateMe({ displayName }) {
      const data = await request<unknown>("PATCH", "/users/me", { displayName });
      return mapUser(data);
    },
    async deleteAccount({ password }) {
      await request<void>("DELETE", "/users/me", { password });
    },
    async getDigestPreference() {
      const data = await request<{ digestEnabled: boolean }>("GET", "/users/me");
      return { digestEnabled: data.digestEnabled };
    },
    async updateDigestPreference(digestEnabled) {
      const data = await request<{ digestEnabled: boolean }>("PATCH", "/users/me", {
        digestEnabled,
      });
      return { digestEnabled: data.digestEnabled };
    },
  },

  subscriptions: {
    async planUsage() {
      return request<PlanUsage>("GET", "/plan-usage");
    },
  },

  billing: {
    async createCheckoutSession(interval) {
      return request<{ url: string }>("POST", "/billing/checkout-session", { interval });
    },
    async createPortalSession() {
      return request<{ url: string }>("POST", "/billing/portal-session");
    },
  },

  auth: {
    async register({ displayName, email, password, confirmPassword, turnstileToken }) {
      // No accessToken in the response — registration no longer signs the
      // user in directly; they land signed-in only after verifyEmail().
      return request<{ email: string; status: "PENDING_VERIFICATION" }>(
        "POST",
        "/auth/register",
        { displayName, email, password, confirmPassword, turnstileToken },
        true,
      );
    },

    async verifyEmail(token) {
      const data = await request<{ user: unknown; accessToken: string }>(
        "POST",
        "/auth/verify-email",
        { token },
        true,
      );
      accessToken = data.accessToken;
      return { user: mapUser(data.user) };
    },

    async login({ email, password, turnstileToken }) {
      const data = await request<{ user: unknown; accessToken: string }>(
        "POST",
        "/auth/login",
        { email, password, ...(turnstileToken ? { turnstileToken } : {}) },
        true,
      );
      accessToken = data.accessToken;
      return { user: mapUser(data.user) };
    },

    async logout() {
      try {
        await request<void>("POST", "/auth/logout");
      } finally {
        accessToken = null;
      }
    },

    async session() {
      try {
        const data = await request<{ authenticated: boolean; user: unknown }>(
          "GET",
          "/auth/session",
        );
        return {
          authenticated: data.authenticated,
          user: data.user ? mapUser(data.user) : null,
        };
      } catch {
        accessToken = null;
        return { authenticated: false, user: null };
      }
    },

    async requestPasswordReset({ email }) {
      await request<void>("POST", "/auth/password-reset/request", { email }, true);
    },

    async resetPassword({ token, password, confirmPassword }) {
      await request<void>(
        "POST",
        "/auth/password-reset/confirm",
        { token, password, confirmPassword },
        true,
      );
    },

    async extensionHandoff() {
      return request<{ accessToken: string; accessTokenExpiresIn: number }>(
        "POST",
        "/auth/extension-handoff",
      );
    },
  },
};
