import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { QueueService } from "./queue.service";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>("redis.url") },
      }),
    }),
    BullModule.registerQueue(
      { name: "item-processing" },
      { name: "account-purge" },
      { name: "dispatcher" },
      { name: "bookshelf-rules" },
      { name: "email-digest" },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
