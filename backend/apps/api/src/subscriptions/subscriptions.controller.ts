import { Controller, Get } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";

@Controller()
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @Get("plan-usage")
  planUsage(@CurrentUser() u: JwtPayload) {
    return this.subs.getPlanAndUsage(u.sub);
  }

  @Get("plans")
  plans() {
    return this.subs.getAvailablePlans();
  }
}
