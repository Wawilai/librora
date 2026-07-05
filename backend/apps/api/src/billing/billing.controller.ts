import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { z } from "zod";
import { BillingService } from "./billing.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

const CheckoutSessionSchema = z.object({
  interval: z.enum(["monthly", "yearly"]),
});

@Controller("billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  @Post("checkout-session")
  @HttpCode(HttpStatus.OK)
  createCheckoutSession(
    @CurrentUser() u: JwtPayload,
    @Body(new ZodValidationPipe(CheckoutSessionSchema))
    dto: z.infer<typeof CheckoutSessionSchema>,
  ) {
    return this.billing.createCheckoutSession(u.sub, dto.interval);
  }

  @Post("portal-session")
  @HttpCode(HttpStatus.OK)
  createPortalSession(@CurrentUser() u: JwtPayload) {
    return this.billing.createPortalSession(u.sub);
  }

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException({ code: "STRIPE_WEBHOOK_INVALID", message: "Missing signature or body" });
    }
    await this.billing.handleWebhookEvent(req.rawBody, signature);
    return { received: true };
  }
}
