import type { BookshelfDef, BookshelfRule, LibraryItem, MockUser, PlanUsage } from "./types";

/**
 * Typed contract for the Librora API.
 *
 * The production adapter talks to the NestJS API and keeps the JWT access token
 * in module memory only. Application code should depend on the exported
 * `adapter` switch point.
 */
export interface ApiClient {
  items: {
    list(params?: {
      bookshelf?: string;
      archived?: boolean;
      readingList?: boolean;
      limit?: number;
    }): Promise<LibraryItem[]>;
    get(id: string): Promise<LibraryItem>;
    create(input: {
      url: string;
      customTitle?: string;
      note?: string;
      tags?: string[];
    }): Promise<LibraryItem>;
    checkExisting(url: string): Promise<{ exists: true; item: LibraryItem } | { exists: false }>;
    update(id: string, patch: Partial<LibraryItem>): Promise<LibraryItem>;
    setNote(id: string, note: string): Promise<LibraryItem>;
    toggleReadingList(id: string): Promise<LibraryItem>;
    archive(id: string): Promise<LibraryItem>;
    restore(id: string): Promise<LibraryItem>;
    remove(id: string): Promise<void>;
    reprocess(id: string): Promise<LibraryItem>;
    retry(id: string): Promise<LibraryItem>;
    exportOne(id: string, format: "md" | "epub"): Promise<Blob>;
    exportBulk(
      format: "md" | "epub",
      filter?: {
        status?: string;
        tag?: string;
        bookshelf?: string;
        readingList?: boolean;
        archived?: boolean;
        query?: string;
      },
    ): Promise<Blob>;
  };
  bookshelves: {
    list(): Promise<BookshelfDef[]>;
  };
  bookshelfRules: {
    list(): Promise<BookshelfRule[]>;
    create(
      input:
        | { type: "AUTO_ARCHIVE_AFTER_DAYS"; config: { days: number } }
        | { type: "AUTO_TAG_BY_DOMAIN"; config: { domain: string; tag: string } },
    ): Promise<BookshelfRule>;
    update(
      id: string,
      patch: { enabled?: boolean; config?: Record<string, unknown> },
    ): Promise<BookshelfRule>;
    remove(id: string): Promise<void>;
    applyNow(id: string): Promise<{ queued: true }>;
  };
  tags: {
    rename(oldTag: string, newTag: string): Promise<void>;
    remove(tag: string): Promise<void>;
  };
  search: {
    keyword(q: string, limit?: number): Promise<{ items: LibraryItem[]; total: number }>;
    semantic(
      q: string,
      limit?: number,
    ): Promise<{ items: LibraryItem[]; total: number; scores: number[] }>;
  };
  users: {
    updateMe(input: { displayName: string }): Promise<MockUser>;
    deleteAccount(input: { password: string }): Promise<void>;
    getDigestPreference(): Promise<{ digestEnabled: boolean }>;
    updateDigestPreference(digestEnabled: boolean): Promise<{ digestEnabled: boolean }>;
  };
  subscriptions: {
    planUsage(): Promise<PlanUsage>;
  };
  billing: {
    createCheckoutSession(interval: "monthly" | "yearly"): Promise<{ url: string }>;
    createPortalSession(): Promise<{ url: string }>;
  };
  auth: {
    register(input: {
      displayName: string;
      email: string;
      password: string;
      confirmPassword: string;
      turnstileToken: string;
    }): Promise<{ email: string; status: "PENDING_VERIFICATION" }>;
    verifyEmail(token: string): Promise<{ user: MockUser }>;
    login(input: {
      email: string;
      password: string;
      turnstileToken?: string;
    }): Promise<{ user: MockUser }>;
    logout(): Promise<void>;
    session(): Promise<{ authenticated: boolean; user: MockUser | null }>;
    requestPasswordReset(input: { email: string }): Promise<void>;
    resetPassword(input: {
      token: string;
      password: string;
      confirmPassword: string;
    }): Promise<void>;
    extensionHandoff(): Promise<{
      accessToken: string;
      accessTokenExpiresIn: number;
    }>;
  };
}
