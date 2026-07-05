import { Controller, Get, Patch, Delete, Body, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { TagsService, RenameTagSchema, RenameTagDto } from "./tags.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller()
export class TagsController {
  constructor(private tags: TagsService) {}

  @Get("tags")
  list(@CurrentUser() u: JwtPayload) {
    return this.tags.list(u.sub);
  }

  @Patch("tags/:tag")
  rename(
    @CurrentUser() u: JwtPayload,
    @Param("tag") oldTag: string,
    @Body(new ZodValidationPipe(RenameTagSchema)) dto: RenameTagDto,
  ) {
    return this.tags.rename(u.sub, oldTag, dto);
  }

  @Delete("tags/:tag")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() u: JwtPayload, @Param("tag") tag: string) {
    return this.tags.remove(u.sub, tag);
  }

  @Patch("items/:itemId/tags/:tag")
  addTag(@CurrentUser() u: JwtPayload, @Param("itemId") itemId: string, @Param("tag") tag: string) {
    return this.tags.addTagToItem(u.sub, itemId, tag);
  }

  @Delete("items/:itemId/tags/:tag")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTag(@CurrentUser() u: JwtPayload, @Param("itemId") itemId: string, @Param("tag") tag: string) {
    return this.tags.removeTagFromItem(u.sub, itemId, tag);
  }
}
