import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { currentBillingPeriod, nextBillingReset } from "../common/billing-period.util";

const PLAN_LIMITS = {
  FREE: { aiProcessing: 0, semanticSearch: 0, reprocess: 0 },
  PREMIUM: { aiProcessing: 300, semanticSearch: 1000, reprocess: 50 },
};

const PLAN_FEATURES = {
  FREE: {
    aiAbstract: false,
    aiTagging: false,
    aiBookshelf: false,
    aiToc: false,
    semanticSearch: false,
    reprocessItem: false,
    bookshelfRules: false,
    export: false,
  },
  PREMIUM: {
    aiAbstract: true,
    aiTagging: true,
    aiBookshelf: true,
    aiToc: true,
    semanticSearch: true,
    reprocessItem: true,
    bookshelfRules: true,
    export: true,
  },
};

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getPlanAndUsage(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    const plan = (sub?.plan ?? "FREE") as "FREE" | "PREMIUM";
    const limits = PLAN_LIMITS[plan];
    const features = PLAN_FEATURES[plan];

    const startedAt = sub?.startedAt ?? new Date();
    const period = currentBillingPeriod(startedAt);
    const usage = await this.prisma.usagePeriod.findUnique({
      where: { userId_period: { userId, period } },
    });

    return {
      subscription: {
        planCode: plan,
        planName: plan === "PREMIUM" ? "Premium" : "Free",
        status: sub?.status ?? "ACTIVE",
        startedAt: sub?.startedAt ?? null,
        expiresAt: sub?.expiresAt ?? null,
        cycleResetsAt: nextBillingReset(startedAt),
      },
      features,
      usage: [
        {
          metric: "AI_PROCESSING",
          used: usage?.aiAbstractsUsed ?? 0,
          limit: limits.aiProcessing,
          remaining: Math.max(0, limits.aiProcessing - (usage?.aiAbstractsUsed ?? 0)),
        },
        {
          metric: "SEMANTIC_SEARCH",
          used: usage?.semanticSearches ?? 0,
          limit: limits.semanticSearch,
          remaining: Math.max(0, limits.semanticSearch - (usage?.semanticSearches ?? 0)),
        },
        {
          metric: "REPROCESS",
          used: usage?.reprocessCount ?? 0,
          limit: limits.reprocess,
          remaining: Math.max(0, limits.reprocess - (usage?.reprocessCount ?? 0)),
        },
      ],
    };
  }

  async getAvailablePlans() {
    return [
      {
        code: "FREE",
        name: "Free",
        description: "Personal Library และ Keyword Search",
        features: PLAN_FEATURES.FREE,
        limits: PLAN_LIMITS.FREE,
      },
      {
        code: "PREMIUM",
        name: "Premium",
        description: "AI-powered library ครบชุด",
        features: PLAN_FEATURES.PREMIUM,
        limits: PLAN_LIMITS.PREMIUM,
      },
    ];
  }
}
