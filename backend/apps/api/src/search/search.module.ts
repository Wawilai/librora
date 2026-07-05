import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [SubscriptionsModule, ConfigModule],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
