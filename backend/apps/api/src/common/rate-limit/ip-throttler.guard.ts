import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FastifyRequest } from "fastify";
import { RateLimitService } from "./rate-limit.service";
import { RATE_LIMIT_KEY, RateLimitOptions } from "./rate-limit.decorator";

// Sibling to UserThrottlerGuard, for routes with no authenticated user yet —
// register is the motivating case: a bot flooding /auth/register never has a
// user id to key on, so this keys on the client IP instead. Requires
// `trustProxy` on the Fastify adapter (see main.ts) so `request.ip` reflects
// the real client rather than the reverse proxy's address once deployed.
@Injectable()
export class IpThrottlerGuard implements CanActivate {
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

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const routeKey = `${context.getClass().name}.${context.getHandler().name}`;
    const key = `ratelimit:ip:${routeKey}:${request.ip}`;
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
