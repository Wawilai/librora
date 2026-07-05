import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    // Explicit per-app connection budget against Supabase's Free-tier pooler —
    // api and worker each get their own DATABASE_URL_* so one app's pool
    // sizing/tuning never starves the other's connections.
    super({ datasources: { db: { url: config.get<string>("database.url") } } });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
