import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterSchema, RegisterDto } from "./dto/register.dto";
import { LoginSchema, LoginDto } from "./dto/login.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { IpThrottlerGuard } from "../common/rate-limit/ip-throttler.guard";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { z } from "zod";

const REFRESH_COOKIE = "refresh_token";
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  // In production the frontend and API are deployed as separate Railway
  // services on different `*.up.railway.app` subdomains — `up.railway.app`
  // is on the public suffix list, so those subdomains are cross-site to
  // each other, not just cross-origin. Every fetch()-based refresh call is
  // therefore a cross-site subresource request: both "strict" and "lax"
  // drop the cookie on those (they only differ on top-level navigation),
  // so only "none" (paired with mandatory Secure) actually delivers the
  // cookie. Locally frontend/api share `localhost`, so "lax" is fine there
  // and avoids requiring HTTPS in dev.
  sameSite: (isProduction ? "none" : "lax") as const,
  path: "/api/v1/auth",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});
const PasswordResetConfirmSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @UseGuards(IpThrottlerGuard)
  @RateLimit({ limit: 5, windowSeconds: 3600 })
  @Post("register")
  async register(@Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto) {
    // No tokens/cookie yet — register() no longer signs the user in;
    // verifyEmail() below is where a session actually starts.
    return this.auth.register(dto);
  }

  @Public()
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body(new ZodValidationPipe(z.object({ token: z.string().min(1) })))
    dto: { token: string },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Res({ passthrough: true }) reply: any,
  ) {
    const result = await this.auth.verifyEmail(dto.token);
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    const { refreshToken: _, ...response } = result;
    return response;
  }

  @Public()
  @UseGuards(IpThrottlerGuard)
  @RateLimit({ limit: 10, windowSeconds: 900 })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Res({ passthrough: true }) reply: any,
  ) {
    const result = await this.auth.login(dto, req.ip);
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    const { refreshToken: _, ...response } = result;
    return response;
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Res({ passthrough: true }) reply: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = ((req as any).cookies as Record<string, string>)?.[REFRESH_COOKIE];
    const result = await this.auth.refresh(raw);
    reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
    const { refreshToken: _, ...response } = result;
    return response;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Res({ passthrough: true }) reply: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = ((req as any).cookies as Record<string, string>)?.[REFRESH_COOKIE];
    await this.auth.logout(raw);
    reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
  }

  @Get("session")
  async session(@CurrentUser() user: JwtPayload) {
    return this.auth.session(user.sub);
  }

  // Hands the extension a short-lived access token for the current web user.
  // The extension never receives a refresh token.
  @Post("extension-handoff")
  @HttpCode(HttpStatus.OK)
  async extensionHandoff(@CurrentUser() user: JwtPayload) {
    return this.auth.issueExtensionHandoff(user.sub);
  }

  @Public()
  @Post("password-reset/request")
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestPasswordReset(
    @Body(new ZodValidationPipe(PasswordResetRequestSchema))
    dto: z.infer<typeof PasswordResetRequestSchema>,
  ) {
    await this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Post("password-reset/confirm")
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body(new ZodValidationPipe(PasswordResetConfirmSchema))
    dto: z.infer<typeof PasswordResetConfirmSchema>,
  ) {
    await this.auth.resetPassword(dto.token, dto.password);
  }
}
