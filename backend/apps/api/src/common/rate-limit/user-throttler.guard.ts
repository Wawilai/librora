import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FastifyRequest } from "fastify";
import { RateLimitService } from "./rate-limit.service";
import { RATE_LIMIT_KEY, RateLimitOptions } from "./rate-limit.decorator";
import { JwtPayload } from "../decorators/current-user.decorator";

// Per-user (not per-IP) throttle — keyed on the authenticated user id, since
// JwtAuthGuard (APP_GUARD, runs first) already populates request.user by the
// time this guard runs. @nestjs/throttler's ThrottlerModule.forRoot() in
// app.module.ts has no guard wired to it anywhere, so it does nothing; this
// guard is a separate, deliberately-scoped mechanism for the two routes that
// actually need per-user budgets (item create/reprocess), not a global limiter.
@Injectable()
export class UserThrottlerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest & { user: JwtPayload }>();
    const userId = request.user?.sub;
    if (!userId) return true; // no user context — let JwtAuthGuard's own check handle auth

    const routeKey = `${context.getClass().name}.${context.getHandler().name}`;
    const key = `ratelimit:${routeKey}:${userId}`;
    const count = await this.rateLimit.hit(key, options.windowSeconds);

    if (count > options.limit) {
      throw new HttpException(
        { code: "RATE_LIMITED", message: "Too many requests, please slow down." },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
