import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { LibraryItemsService } from "./library-items.service";
import { CreateItemSchema, CreateItemDto } from "./dto/create-item.dto";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { z } from "zod";
import { UserThrottlerGuard } from "../common/rate-limit/user-throttler.guard";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";

const NoteSchema = z.object({ note: z.string().max(10000) });
const UpdateSchema = z.object({
  customTitle: z.string().trim().max(500).nullable().optional(),
  personalNote: z.string().max(10000).nullable().optional(),
});
const CheckExistingSchema = z.object({ url: z.string().url() });

@Controller("items")
export class LibraryItemsController {
  constructor(private items: LibraryItemsService) {}

  // ── Collection ────────────────────────────────────────────────────────────

  @Get()
  list(
    @CurrentUser() u: JwtPayload,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("tag") tag?: string,
    @Query("bookshelf") bookshelf?: string,
    @Query("readingList") readingList?: string,
    @Query("archived") archived?: string,
    @Query("sort") sort?: string,
    @Query("query") query?: string,
  ) {
    return this.items.list(u.sub, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      tag,
      bookshelf,
      readingList: readingList !== undefined ? readingList === "true" : undefined,
      archived: archived === "true",
      sort,
      query,
    });
  }

  @Post("check-existing")
  checkExisting(
    @CurrentUser() u: JwtPayload,
    @Body(new ZodValidationPipe(CheckExistingSchema)) body: { url: string },
  ) {
    return this.items.checkExisting(u.sub, body.url);
  }

  @Post()
  @UseGuards(UserThrottlerGuard)
  @RateLimit({ limit: 30, windowSeconds: 60 })
  create(
    @CurrentUser() u: JwtPayload,
    @Body(new ZodValidationPipe(CreateItemSchema)) dto: CreateItemDto,
  ) {
    return this.items.create(u.sub, dto);
  }

  // ── Single item ───────────────────────────────────────────────────────────

  @Get(":id")
  get(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.items.get(u.sub, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() u: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateSchema)) body: { customTitle?: string | null; personalNote?: string | null },
  ) {
    return this.items.update(u.sub, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.items.remove(u.sub, id);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  @Patch(":id/note")
  setNote(
    @CurrentUser() u: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(NoteSchema)) body: { note: string },
  ) {
    return this.items.setNote(u.sub, id, body.note);
  }

  @Put(":id/reading-list")
  addToReadingList(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.items.addToReadingList(u.sub, id);
  }

  @Delete(":id/reading-list")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFromReadingList(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.items.removeFromReadingList(u.sub, id);
  }

  @Put(":id/archive")
  archive(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.items.archive(u.sub, id);
  }

  @Delete(":id/archive")
  @HttpCode(HttpStatus.NO_CONTENT)
  restore(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.items.restore(u.sub, id);
  }

  @Post(":id/reprocess")
  @UseGuards(UserThrottlerGuard)
  @RateLimit({ limit: 10, windowSeconds: 60 })
  reprocess(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.items.reprocess(u.sub, id);
  }
}
