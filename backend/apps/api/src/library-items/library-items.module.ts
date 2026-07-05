import { Module } from "@nestjs/common";
import { LibraryItemsService } from "./library-items.service";
import { LibraryItemsController } from "./library-items.controller";
import { ViewsController } from "./views.controller";
import { QueueModule } from "../queue/queue.module";
import { RateLimitModule } from "../common/rate-limit/rate-limit.module";

@Module({
  imports: [QueueModule, RateLimitModule],
  providers: [LibraryItemsService],
  controllers: [LibraryItemsController, ViewsController],
  exports: [LibraryItemsService],
})
export class LibraryItemsModule {}
