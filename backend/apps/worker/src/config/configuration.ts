export default () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
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
  accountDeletion: {
    graceDays: parseInt(process.env.ACCOUNT_DELETION_GRACE_DAYS ?? "30", 10),
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "noreply@librora.app",
  },
  webBaseUrl: process.env.WEB_BASE_URL ?? "http://localhost:5173",
});
