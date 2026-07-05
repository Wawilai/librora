import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  RawBodyRequest,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { BillingService } from "./billing.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";

@Controller("billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  @Post("checkout-session")
  @HttpCode(HttpStatus.OK)
  createCheckoutSession(@CurrentUser() u: JwtPayload) {
    return this.billing.createCheckoutSession(u.sub);
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
