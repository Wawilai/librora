import { Module } from "@nestjs/common";
import { RateLimitService } from "./rate-limit.service";
import { UserThrottlerGuard } from "./user-throttler.guard";
import { IpThrottlerGuard } from "./ip-throttler.guard";

@Module({
  providers: [RateLimitService, UserThrottlerGuard, IpThrottlerGuard],
  exports: [RateLimitService, UserThrottlerGuard, IpThrottlerGuard],
})
export class RateLimitModule {}
