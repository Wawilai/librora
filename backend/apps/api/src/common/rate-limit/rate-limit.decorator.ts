import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rateLimit";

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

// Applied per-route; UserThrottlerGuard reads this to know the budget for
// the current handler. No default — routes must opt in explicitly.
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
