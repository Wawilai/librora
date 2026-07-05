import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "./prisma/prisma.module";
import { ItemProcessingProcessor } from "./processors/item-processing.processor";
import { AccountPurgeProcessor } from "./processors/account-purge.processor";
import { DispatcherProcessor } from "./processors/dispatcher.processor";
import { BookshelfRulesProcessor } from "./processors/bookshelf-rules.processor";
import { EmailDigestProcessor } from "./processors/email-digest.processor";
import { EmailService } from "./email/email.service";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
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
    PrismaModule,
  ],
  providers: [
    ItemProcessingProcessor,
    AccountPurgeProcessor,
    DispatcherProcessor,
    BookshelfRulesProcessor,
    EmailDigestProcessor,
    EmailService,
  ],
})
export class WorkerModule {}
