import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { LibraryItemsModule } from "./library-items/library-items.module";
import { TagsModule } from "./tags/tags.module";
import { BookshelvesModule } from "./bookshelves/bookshelves.module";
import { SearchModule } from "./search/search.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { FeatureGateModule } from "./feature-gate/feature-gate.module";
import { QueueModule } from "./queue/queue.module";
import { BillingModule } from "./billing/billing.module";
import { BookshelfRulesModule } from "./bookshelf-rules/bookshelf-rules.module";
import { ExportModule } from "./export/export.module";
import { SetupModule } from "./setup/setup.module";
import { HealthController } from "./health/health.controller";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LibraryItemsModule,
    TagsModule,
    BookshelvesModule,
    SearchModule,
    SubscriptionsModule,
    FeatureGateModule,
    QueueModule,
    BillingModule,
    BookshelfRulesModule,
    ExportModule,
    SetupModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
