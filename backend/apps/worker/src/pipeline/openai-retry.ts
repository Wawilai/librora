import OpenAI from "openai";

const MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 5_000;
const MAX_RETRY_AFTER_MS = 60_000;

function retryDelayMs(err: InstanceType<typeof OpenAI.RateLimitError>): number {
  // openai@4's own `Headers` type (openai/core.d.ts) is a plain
  // Record<string, string | null | undefined> — NOT the Web API Headers
  // class — so bracket access is correct; there is no .get() method.
  const header = err.headers?.["retry-after"];
  const seconds = header ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }
  return DEFAULT_RETRY_AFTER_MS;
}

// Wraps a single OpenAI SDK call with retry-after-aware backoff for 429s.
// BullMQ's job-level retry already handles hard failures; this exists so a
// single rate-limit blip doesn't burn a whole job attempt (and its lock).
export async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof OpenAI.RateLimitError) || attempt >= MAX_RETRIES) {
        throw err;
      }
      const delay = retryDelayMs(err);
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
