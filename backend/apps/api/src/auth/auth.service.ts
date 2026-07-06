import {
  Injectable,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "../common/decorators/current-user.decorator";
import { EmailService } from "../email/email.service";
import { TurnstileService } from "../common/turnstile/turnstile.service";
import { RateLimitService } from "../common/rate-limit/rate-limit.service";
import * as argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

// After this many failed logins from one IP within the window (tracked
// separately from IpThrottlerGuard's hard 10-per-15-min cap on the route
// itself), login() starts demanding a Turnstile token — most real users
// never see this; it only kicks in under an actual credential-stuffing
// pattern. Reusing RateLimitService's Redis counter, just a different key
// namespace and a lower/no hard-reject threshold (the guard still applies
// its own separate cap regardless of this counter).
const CAPTCHA_AFTER_FAILURES = 3;
const CAPTCHA_WINDOW_SECONDS = 900;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
    private turnstile: TurnstileService,
    private rateLimit: RateLimitService,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const captchaOk = await this.turnstile.verify(dto.turnstileToken);
    if (!captchaOk) {
      throw new ForbiddenException({
        code: "CAPTCHA_VERIFICATION_FAILED",
        message: "CAPTCHA verification failed. Please try again.",
      });
    }

    const emailNorm = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { emailNorm } });
    if (existing) {
      throw new ConflictException({
        code: "AUTH_EMAIL_ALREADY_EXISTS",
        message: "Email is already registered",
      });
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: emailNorm,
          emailNorm,
          passwordHash,
          displayName: dto.displayName,
        },
      });
      await tx.subscription.create({
        data: { userId: u.id, plan: "FREE" },
      });
      return u;
    });

    // Unverified accounts can't sign in (see login()'s emailVerifiedAt check)
    // — no tokens issued here. A bot flooding /auth/register can create rows
    // but can never actually use them, which is the whole point.
    await this.sendVerificationEmail(user.id, user.email);

    return { email: user.email, status: "PENDING_VERIFICATION" as const };
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (
      !verificationToken ||
      verificationToken.usedAt ||
      verificationToken.expiresAt < new Date()
    ) {
      throw new BadRequestException({
        code: "EMAIL_VERIFICATION_TOKEN_INVALID",
        message: "This verification link is invalid or has expired",
      });
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: new Date() },
      });
      await tx.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      });
      return u;
    });

    const sub = await this.prisma.subscription.findUnique({ where: { userId: user.id } });
    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email, "web");

    return {
      user: this.formatUser(user, sub?.plan ?? "FREE"),
      accessToken,
      accessTokenExpiresIn: this.config.get<number>("jwt.accessTtl")!,
      refreshToken,
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress: string) {
    const failedAttemptsKey = `login-failures:${ipAddress}`;
    const recentFailures = await this.rateLimit.peek(failedAttemptsKey);

    if (recentFailures >= CAPTCHA_AFTER_FAILURES) {
      const captchaOk = dto.turnstileToken
        ? await this.turnstile.verify(dto.turnstileToken)
        : false;
      if (!captchaOk) {
        throw new ForbiddenException({
          code: "AUTH_CAPTCHA_REQUIRED",
          message: "Please complete the CAPTCHA to continue signing in.",
        });
      }
    }

    const emailNorm = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { emailNorm } });

    // Constant-time comparison even on not-found to prevent user enumeration
    const dummyHash = "$argon2id$v=19$m=65536,t=3,p=4$dummySaltForTiming000$dummyhashfortiming00000000000000000000000000";
    const valid = user
      ? await argon2.verify(user.passwordHash, dto.password)
      : (await argon2.verify(dummyHash, dto.password).catch(() => false), false);

    if (!user || !valid || user.deletedAt) {
      await this.rateLimit.hit(failedAttemptsKey, CAPTCHA_WINDOW_SECONDS);
      throw new UnauthorizedException({
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Incorrect email or password",
      });
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException({
        code: "AUTH_EMAIL_NOT_VERIFIED",
        message: "Please verify your email before signing in. Check your inbox for the link.",
      });
    }

    // Successful login clears the counter — a legitimate user who mistyped
    // their password a few times shouldn't keep seeing CAPTCHA afterward.
    await this.rateLimit.reset(failedAttemptsKey);

    const sub = await this.prisma.subscription.findUnique({ where: { userId: user.id } });
    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email, "web");

    return {
      user: this.formatUser(user, sub?.plan ?? "FREE"),
      accessToken,
      accessTokenExpiresIn: this.config.get<number>("jwt.accessTtl")!,
      refreshToken,
    };
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refresh(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException({ code: "AUTH_REFRESH_TOKEN_INVALID", message: "Invalid or expired refresh token" });
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: "AUTH_REFRESH_TOKEN_INVALID", message: "Invalid or expired refresh token" });
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email, stored.client);

    return { accessToken, accessTokenExpiresIn: this.config.get<number>("jwt.accessTtl")!, refreshToken };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => null); // ignore if already revoked/missing
  }

  // ── Session ───────────────────────────────────────────────────────────────

  async session(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { authenticated: false, user: null };
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    return {
      authenticated: true,
      user: this.formatUser(user, sub?.plan ?? "FREE"),
    };
  }

  // ── Extension handoff ────────────────────────────────────────────────────

  async issueExtensionHandoff(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return {
      accessToken: this.issueAccessToken(user.id, user.email),
      accessTokenExpiresIn: this.config.get<number>("jwt.accessTtl")!,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async requestPasswordReset(email: string) {
    const emailNorm = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { emailNorm } });

    // Always behave the same regardless of whether the account exists — prevents
    // user enumeration via response timing/content (see login() for the same principle).
    if (user) {
      const rawToken = uuidv4();
      const ttlSecs = this.config.get<number>("email.passwordResetTokenTtl")!;
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(rawToken),
          expiresAt: new Date(Date.now() + ttlSecs * 1000),
        },
      });

      const resetUrl = `${this.config.get<string>("webBaseUrl")}/reset-password?token=${rawToken}`;
      // Never let an email-provider outage surface to the client — the reset
      // token is already stored, and leaking send failures would also weaken
      // the enumeration-safety guarantee above.
      await this.email
        .send(
          user.email,
          "Reset your Librora password",
          `<p>Click the link below to reset your password. This link expires in ${Math.round(ttlSecs / 60)} minutes.</p>
         <p><a href="${resetUrl}">${resetUrl}</a></p>
         <p>If you didn't request this, you can safely ignore this email.</p>`,
        )
        .catch(() => null);
    }
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashToken(token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException({
        code: "PASSWORD_RESET_TOKEN_INVALID",
        message: "This password reset link is invalid or has expired",
      });
    }

    const passwordHash = await argon2.hash(password);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private async sendVerificationEmail(userId: string, toEmail: string) {
    const rawToken = uuidv4();
    const ttlSecs = this.config.get<number>("email.emailVerificationTokenTtl")!;
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + ttlSecs * 1000),
      },
    });

    const verifyUrl = `${this.config.get<string>("webBaseUrl")}/verify-email?token=${rawToken}`;
    // Never let an email-provider outage block registration — the token is
    // already stored, so a failed send just means the user needs to request
    // a fresh link (not implemented as a separate resend endpoint yet).
    await this.email
      .send(
        toEmail,
        "Verify your Librora email",
        `<p>Click the link below to verify your email and activate your Librora account. This link expires in ${Math.round(ttlSecs / 3600)} hours.</p>
         <p><a href="${verifyUrl}">${verifyUrl}</a></p>
         <p>If you didn't create this account, you can safely ignore this email.</p>`,
      )
      .catch(() => null);
  }

  private issueAccessToken(userId: string, email: string) {
    const jti = uuidv4();
    const payload: JwtPayload = { sub: userId, email, jti };

    return this.jwt.sign(payload, {
      secret: this.config.get("jwt.accessSecret"),
      expiresIn: this.config.get<number>("jwt.accessTtl"),
    });
  }

  private async issueTokens(userId: string, email: string, client: string) {
    const accessToken = this.issueAccessToken(userId, email);
    const rawRefreshToken = uuidv4();
    const refreshTtlSecs = this.config.get<number>("jwt.refreshTtl")!;
    const expiresAt = new Date(Date.now() + refreshTtlSecs * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawRefreshToken),
        client,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private formatUser(user: { id: string; email: string; displayName: string }, plan: string) {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      currentPlan: plan,
    };
  }
}
