export type ItemStatus = "pending" | "processing" | "ready" | "partial" | "failed";

export type Bookshelf =
  | "code"
  | "architecture"
  | "software-development"
  | "business"
  | "management"
  | "design"
  | "research"
  | "news"
  | "tools"
  | "philosophy"
  | "ai"
  | "productivity"
  | "learning"
  | "other";

export type ClassificationSource = "auto" | "manual";
export type PlanTier = "free" | "premium";

export interface LibraryItem {
  id: string;
  url: string;
  domain: string;
  title: string;
  extractedTitle?: string;
  description?: string;
  faviconLetter: string;
  status: ItemStatus;
  sourceType?: "article" | "google_doc";
  bookshelf?: Bookshelf;
  bookshelfSource?: ClassificationSource;
  tags: string[];
  aiAbstract?: string;
  aiDetailedAbstract?: string;
  toc?: { id: string; text: string; level: 1 | 2 | 3; source: "heading" | "ai" }[];
  readableContent?: string;
  personalNote?: string;
  inReadingList?: boolean;
  archived?: boolean;
  addedAt: string;
  processedAt?: string;
  failureReason?: string;
  partialReason?: string;
  language?: string;
  author?: string;
  publishedDate?: string;
}

export interface BookshelfDef {
  slug: Bookshelf;
  label: string;
  description: string;
  itemCount?: number;
}

export interface MockUser {
  id: string;
  email: string;
  displayName: string;
  plan: PlanTier;
  initials: string;
}

export interface BookshelfRule {
  id: string;
  type: "AUTO_ARCHIVE_AFTER_DAYS" | "AUTO_TAG_BY_DOMAIN";
  config: { days: number } | { domain: string; tag: string };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanUsage {
  subscription: {
    planCode: "FREE" | "PREMIUM";
    planName: string;
    status: "ACTIVE" | "CANCELLED" | "EXPIRED";
    startedAt: string | null;
    expiresAt: string | null;
    cycleResetsAt: string;
  };
  features: {
    aiAbstract: boolean;
    aiTagging: boolean;
    aiBookshelf: boolean;
    aiToc: boolean;
    semanticSearch: boolean;
    reprocessItem: boolean;
    bookshelfRules: boolean;
    export: boolean;
  };
  usage: {
    metric: "AI_PROCESSING" | "SEMANTIC_SEARCH" | "REPROCESS";
    used: number;
    limit: number;
    remaining: number;
  }[];
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorEnvelope {
  error: {
    code: ApiErrorCode;
    message: string;
    details: unknown;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export type ApiErrorCode =
  | "ITEM_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_EMAIL_ALREADY_EXISTS"
  | "AUTH_EMAIL_NOT_VERIFIED"
  | "AUTH_CAPTCHA_REQUIRED"
  | "EMAIL_VERIFICATION_TOKEN_INVALID"
  | "CAPTCHA_VERIFICATION_FAILED"
  | "USAGE_QUOTA_EXCEEDED"
  | "ITEM_DUPLICATE"
  | "PLAN_FEATURE_NOT_AVAILABLE"
  | "PASSWORD_RESET_NOT_AVAILABLE"
  // Reused below purely as a generic "request never reached the server"
  // marker for fetch()-level network failures — not the same thing as the
  // backend's actual rate-limit response, which is RATE_LIMITED.
  | "RATE_LIMIT_EXCEEDED"
  | "RATE_LIMITED";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly httpStatus: number;
  readonly details: unknown;
  readonly requestId: string;

  constructor(params: {
    code: ApiErrorCode;
    httpStatus: number;
    message: string;
    details?: unknown;
    requestId?: string;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.httpStatus = params.httpStatus;
    this.details = params.details ?? null;
    this.requestId = params.requestId ?? "";
  }
}
