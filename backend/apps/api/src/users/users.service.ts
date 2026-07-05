import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { z } from "zod";
import * as argon2 from "argon2";

export const UpdateUserSchema = z.object({
  displayName: z.string().trim().min(1).max(150).optional(),
  digestEnabled: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const DeleteAccountSchema = z.object({
  password: z.string().min(1),
});
export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: "USER_NOT_FOUND", message: "User not found" });
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      status: user.status,
      digestEnabled: user.digestEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async update(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.digestEnabled !== undefined ? { digestEnabled: dto.digestEnabled } : {}),
      },
    });
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      digestEnabled: user.digestEnabled,
      updatedAt: user.updatedAt,
    };
  }

  async deactivate(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: "USER_NOT_FOUND", message: "User not found" });

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException({
        code: "AUTH_INVALID_CREDENTIALS",
        message: "รหัสผ่านไม่ถูกต้อง",
      });
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
