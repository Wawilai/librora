import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { z } from "zod";

export const CreateRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("AUTO_ARCHIVE_AFTER_DAYS"),
    config: z.object({ days: z.number().int().min(1).max(3650) }),
  }),
  z.object({
    type: z.literal("AUTO_TAG_BY_DOMAIN"),
    config: z.object({
      domain: z.string().trim().toLowerCase().min(1).max(255),
      tag: z.string().trim().toLowerCase().min(1).max(100),
    }),
  }),
]);
export type CreateRuleDto = z.infer<typeof CreateRuleSchema>;

export const UpdateRuleSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});
export type UpdateRuleDto = z.infer<typeof UpdateRuleSchema>;

const PLAN_FEATURES = {
  FREE: { bookshelfRules: false },
  PREMIUM: { bookshelfRules: true },
} as const;

@Injectable()
export class BookshelfRulesService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  async list(userId: string) {
    return this.prisma.bookshelfRule.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(userId: string, dto: CreateRuleDto) {
    await this.assertPremium(userId);
    return this.prisma.bookshelfRule.create({
      data: { userId, type: dto.type, config: dto.config },
    });
  }

  async update(userId: string, id: string, dto: UpdateRuleDto) {
    await this.assertPremium(userId);
    await this.assertOwner(userId, id);
    return this.prisma.bookshelfRule.update({
      where: { id },
      data: {
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.config !== undefined ? { config: dto.config as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.bookshelfRule.delete({ where: { id } });
  }

  async applyNow(userId: string, id: string) {
    await this.assertPremium(userId);
    const rule = await this.assertOwner(userId, id);
    await this.queue.enqueueBookshelfRule({ ruleId: rule.id });
    return { queued: true };
  }

  private async assertOwner(userId: string, id: string) {
    const rule = await this.prisma.bookshelfRule.findFirst({ where: { id, userId } });
    if (!rule) throw new NotFoundException({ code: "RULE_NOT_FOUND", message: "Rule not found" });
    return rule;
  }

  private async assertPremium(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    const plan = (sub?.plan ?? "FREE") as keyof typeof PLAN_FEATURES;
    if (!PLAN_FEATURES[plan].bookshelfRules) {
      throw new ForbiddenException({
        code: "PREMIUM_REQUIRED",
        message: "Smart bookshelf rules are a Premium feature",
      });
    }
  }
}
