import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { APP_GUARD } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { EmailModule } from "../email/email.module";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";
import { TurnstileModule } from "../common/turnstile/turnstile.module";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets injected per-sign via ConfigService
    EmailModule,
    RateLimitModule,
    TurnstileModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    // Apply JWT guard globally — mark public routes with @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
