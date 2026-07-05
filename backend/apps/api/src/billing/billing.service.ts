import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import Stripe = require("stripe");

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>("stripe.secretKey");
    this.stripe = apiKey ? new Stripe(apiKey) : null;
    if (!this.stripe) {
      this.logger.warn("STRIPE_SECRET_KEY not configured — billing endpoints will return 503");
    } else if (apiKey?.startsWith("sk_test_") && process.env.NODE_ENV === "production") {
      // A test-mode key in a production environment means real users would be
      // "charged" via Stripe's sandbox — no money moves, no real subscription
      // exists, but the app would report success. Loud on purpose: this is
      // the kind of misconfiguration that's silent until a user complains
      // their card was never actually charged.
      this.logger.error(
        "STRIPE_SECRET_KEY is a TEST-mode key (sk_test_...) while NODE_ENV=production — " +
          "real checkouts will not actually charge anyone. Replace with a live key (sk_live_...) " +
          "before accepting real payments.",
      );
    }
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException({
        code: "BILLING_NOT_AVAILABLE",
        message: "Billing is not configured yet",
      });
    }
    return this.stripe;
  }

  async createCheckoutSession(
    userId: string,
    interval: "monthly" | "yearly",
  ): Promise<{ url: string }> {
    const stripe = this.requireStripe();

    const priceId = this.config.get<string>(
      interval === "yearly" ? "stripe.premiumPriceIdYearly" : "stripe.premiumPriceIdMonthly",
    );
    if (!priceId) {
      // Fail loud and specific here rather than sending Stripe an empty/undefined
      // price and getting back an opaque, unhandled 500 — this is exactly the
      // production bug that motivated this check (a Product ID was pasted into
      // the price env var by mistake, and Stripe's rejection wasn't caught).
      throw new BadRequestException({
        code: "INVALID_BILLING_INTERVAL",
        message: `Billing is not configured for the "${interval}" plan yet`,
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: "USER_NOT_FOUND", message: "User not found" });

    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    const customerId =
      sub?.stripeCustomerId ?? (await this.createCustomer(stripe, userId, user.email));

    const webBaseUrl = this.config.get<string>("webBaseUrl")!;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${webBaseUrl}/plan?checkout=success`,
      cancel_url: `${webBaseUrl}/plan?checkout=cancelled`,
      client_reference_id: userId,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout session URL");
    return { url: session.url };
  }

  async createPortalSession(userId: string): Promise<{ url: string }> {
    const stripe = this.requireStripe();
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub?.stripeCustomerId) {
      throw new NotFoundException({
        code: "STRIPE_CUSTOMER_NOT_FOUND",
        message: "No billing account found for this user",
      });
    }

    const webBaseUrl = this.config.get<string>("webBaseUrl")!;
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${webBaseUrl}/plan`,
    });

    return { url: session.url };
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = this.requireStripe();
    const webhookSecret = this.config.get<string>("stripe.webhookSecret")!;
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (!userId || typeof session.customer !== "string") break;

        await this.prisma.subscription.update({
          where: { userId },
          data: {
            plan: "PREMIUM",
            status: "ACTIVE",
            // Anchors the billing/usage-quota cycle to the real payment
            // moment, not the FREE-plan row's signup-time default — see
            // common/billing-period.util.ts for how this is consumed.
            startedAt: new Date(),
            stripeCustomerId: session.customer,
            stripeSubscriptionId:
              typeof session.subscription === "string" ? session.subscription : undefined,
          },
        });
        break;
      }
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const status = stripeSub.status === "active" ? "ACTIVE" : "CANCELLED";
        await this.prisma.subscription
          .updateMany({
            where: { stripeSubscriptionId: stripeSub.id },
            data: {
              status,
              expiresAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
            },
          })
          .catch(() => null);
        break;
      }
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await this.prisma.subscription
          .updateMany({
            where: { stripeSubscriptionId: stripeSub.id },
            data: { plan: "FREE", status: "CANCELLED" },
          })
          .catch(() => null);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async createCustomer(stripe: Stripe, userId: string, email: string): Promise<string> {
    const customer = await stripe.customers.create({ email, metadata: { userId } });
    await this.prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }
}
