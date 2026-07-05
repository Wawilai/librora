import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

// Fixed-window counter via a single INCR+EXPIRE — shared across all API
// instances via Redis, unlike @nestjs/throttler's in-memory default storage
// which would let each replica enforce its own separate limit.
@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.get<string>("redis.url") ?? "redis://localhost:6379");
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  // Returns the hit count for this window after incrementing. Caller compares
  // against its own limit; keeping the limit out of this service lets
  // different routes share one counter implementation with different budgets.
  async hit(key: string, windowSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return count;
  }

  // Reads the current count without incrementing — used to decide whether to
  // demand extra verification (e.g. login()'s progressive CAPTCHA) before an
  // attempt happens, as opposed to hit()'s "count this attempt" semantics.
  async peek(key: string): Promise<number> {
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
