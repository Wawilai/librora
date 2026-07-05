import { Controller, Get, Post, Param, Query, Body, Res, BadRequestException } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ExportService, ExportFormat } from "./export.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";

function parseFormat(format: string | undefined): ExportFormat {
  if (format === "md" || format === "epub") return format;
  throw new BadRequestException({
    code: "VALIDATION_ERROR",
    message: 'format must be "md" or "epub"',
  });
}

@Controller()
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get("items/:id/export")
  async exportOne(
    @CurrentUser() u: JwtPayload,
    @Param("id") id: string,
    @Query("format") format: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.exportService.exportOne(u.sub, id, parseFormat(format));
    reply
      .header("Content-Type", result.contentType)
      .header("Content-Disposition", `attachment; filename="${result.filename}"`);
    return result.buffer;
  }

  @Post("items/export")
  async exportBulk(
    @CurrentUser() u: JwtPayload,
    @Query("format") format: string | undefined,
    @Body()
    body: {
      status?: string;
      tag?: string;
      bookshelf?: string;
      readingList?: boolean;
      archived?: boolean;
      query?: string;
    },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.exportService.exportBulk(u.sub, parseFormat(format), body ?? {});
    reply
      .header("Content-Type", result.contentType)
      .header("Content-Disposition", `attachment; filename="${result.filename}"`);
    return result.buffer;
  }
}
