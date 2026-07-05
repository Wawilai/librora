import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

// Mirrors backend/apps/api/src/email/email.service.ts — apps in this repo
// don't share code across the api/worker boundary (see BOOKSHELF_SLUGS
// duplication in ai-features.ts for the same pattern), so this is a second,
// independent client rather than an import from the api app.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>("email.resendApiKey");
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = this.config.get<string>("email.from")!;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY not configured — skipping email to ${to}: "${subject}"`);
      return;
    }
    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }
}
