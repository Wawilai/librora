export default () => ({
  port: parseInt(process.env.API_PORT ?? process.env.PORT ?? "3001", 10),
  webBaseUrl: process.env.WEB_BASE_URL ?? "http://localhost:5173",
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    accessTtl: parseInt(process.env.JWT_ACCESS_TTL ?? "900", 10),
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? "2592000", 10),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    chatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    embeddingDimension: parseInt(process.env.OPENAI_EMBEDDING_DIMENSION ?? "1536", 10),
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "3", 10),
    maxAttempts: parseInt(process.env.WORKER_MAX_ATTEMPTS ?? "3", 10),
    fetchTimeoutMs: parseInt(process.env.FETCH_TIMEOUT_MS ?? "15000", 10),
    fetchMaxBytes: parseInt(process.env.FETCH_MAX_RESPONSE_BYTES ?? "5242880", 10),
  },
  search: {
    minScore: parseFloat(process.env.SEMANTIC_MIN_SCORE ?? "0.2"),
    defaultLimit: parseInt(process.env.SEMANTIC_DEFAULT_LIMIT ?? "10", 10),
    maxLimit: parseInt(process.env.SEMANTIC_MAX_LIMIT ?? "50", 10),
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "noreply@librora.app",
    passwordResetTokenTtl: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL ?? "1800", 10),
    emailVerificationTokenTtl: parseInt(
      process.env.EMAIL_VERIFICATION_TOKEN_TTL ?? "86400",
      10,
    ),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    premiumPriceIdMonthly: process.env.STRIPE_PREMIUM_PRICE_ID_MONTHLY ?? "",
    premiumPriceIdYearly: process.env.STRIPE_PREMIUM_PRICE_ID_YEARLY ?? "",
  },
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
  },
});
