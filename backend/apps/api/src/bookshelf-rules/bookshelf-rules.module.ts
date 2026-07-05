import { Module } from "@nestjs/common";
import { BookshelfRulesService } from "./bookshelf-rules.service";
import { BookshelfRulesController } from "./bookshelf-rules.controller";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [QueueModule],
  providers: [BookshelfRulesService],
  controllers: [BookshelfRulesController],
})
export class BookshelfRulesModule {}
