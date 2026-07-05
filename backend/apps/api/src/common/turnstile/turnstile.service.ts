import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private config: ConfigService) {}

  // Returns true when the token is valid, or when Turnstile isn't configured
  // (local dev without a Cloudflare account) — mirrors BillingService's/
  // EmailService's "log a warning, degrade gracefully" pattern rather than
  // hard-failing registration for every developer who hasn't set this up.
  async verify(token: string): Promise<boolean> {
    const secretKey = this.config.get<string>("turnstile.secretKey");
    if (!secretKey) {
      this.logger.warn("TURNSTILE_SECRET_KEY not configured — skipping CAPTCHA verification");
      return true;
    }

    try {
      const response = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: secretKey, response: token }),
      });
      const data = (await response.json()) as { success: boolean };
      return data.success === true;
    } catch (err) {
      this.logger.error(`Turnstile verification request failed: ${String(err)}`);
      return false;
    }
  }
}
