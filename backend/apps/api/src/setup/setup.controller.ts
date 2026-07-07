import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../common/decorators/public.decorator";
import { QdrantClient } from "@qdrant/js-client-rest";
import * as argon2 from "argon2";
import { z } from "zod";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

const SetupPremiumUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  setupSecret: z.string().min(1),
});

type SetupPremiumUserDto = z.infer<typeof SetupPremiumUserSchema>;

@Controller("setup")
export class SetupController {
  private readonly logger = new Logger(SetupController.name);
  private readonly qdrant: QdrantClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.qdrant = new QdrantClient({ url: config.get<string>("qdrant.url") });
  }

  @Public()
  @Post("premium-user")
  @HttpCode(HttpStatus.CREATED)
  async createPremiumUser(
    @Body(new ZodValidationPipe(SetupPremiumUserSchema)) dto: SetupPremiumUserDto,
  ) {
    // Guard with a shared secret so this endpoint can't be called by anyone
    // who doesn't have access to the deployment environment.
    const expectedSecret = this.config.get<string>("SETUP_SECRET") ?? process.env.SETUP_SECRET;
    if (!expectedSecret || dto.setupSecret !== expectedSecret) {
      // Return 201 shape but with an error to avoid leaking whether the secret
      // is configured — callers with the right secret will always succeed.
      this.logger.warn("setup/premium-user called with invalid setupSecret");
      return { ok: false, error: "INVALID_SETUP_SECRET" };
    }

    const emailNorm = dto.email.trim().toLowerCase();

    // Upsert user — idempotent so re-running the setup script is safe.
    const existing = await this.prisma.user.findUnique({ where: { emailNorm } });

    let userId: string;

    if (existing) {
      this.logger.log(`setup: user ${emailNorm} already exists (id=${existing.id}), upserting subscription`);
      userId = existing.id;
    } else {
      const passwordHash = await argon2.hash(dto.password);
      const user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: emailNorm,
            emailNorm,
            passwordHash,
            displayName: dto.displayName,
            // Mark email as already verified — this is an admin-created account,
            // not a self-registration flow.
            emailVerifiedAt: new Date(),
          },
        });
        await tx.subscription.create({
          data: { userId: u.id, plan: "FREE" },
        });
        return u;
      });
      userId = user.id;
      this.logger.log(`setup: created user ${emailNorm} (id=${userId})`);
    }

    // Upgrade subscription to PREMIUM (upsert — safe to call multiple times).
    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: "PREMIUM", status: "ACTIVE", startedAt: new Date() },
      update: { plan: "PREMIUM", status: "ACTIVE", startedAt: new Date() },
    });
    this.logger.log(`setup: subscription set to PREMIUM for user ${userId}`);

    // Ensure the Qdrant collection exists so the worker can start upserting
    // vectors immediately when the first item is processed.
    const collection = this.config.get<string>("qdrant.collection") ?? "librora_items";
    const dimension = this.config.get<number>("openai.embeddingDimension") ?? 1536;

    try {
      const { exists } = await this.qdrant.collectionExists(collection);
      if (!exists) {
        await this.qdrant.createCollection(collection, {
          vectors: { size: dimension, distance: "Cosine" },
        });
        this.logger.log(`setup: created Qdrant collection "${collection}" (dim=${dimension})`);
      } else {
        this.logger.log(`setup: Qdrant collection "${collection}" already exists`);
      }
    } catch (err) {
      // Non-fatal — the worker's ensureCollection() call will retry on the
      // first item-processing job. Log and continue so the user is still created.
      this.logger.warn(`setup: Qdrant collection check/create failed (non-fatal): ${String(err)}`);
    }

    return {
      ok: true,
      userId,
      email: emailNorm,
      plan: "PREMIUM",
      qdrantCollection: collection,
    };
  }
}
