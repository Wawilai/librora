import { Controller, Get, Put, Delete, Body, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { BookshelvesService, SetBookshelfSchema, SetBookshelfDto } from "./bookshelves.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Public } from "../common/decorators/public.decorator";

@Controller()
export class BookshelvesController {
  constructor(private shelves: BookshelvesService) {}

  @Public()
  @Get("bookshelves")
  list() {
    return this.shelves.list();
  }

  @Public()
  @Get("bookshelves/:slug")
  get(@Param("slug") slug: string) {
    return this.shelves.get(slug);
  }

  @Put("items/:itemId/bookshelf")
  setBookshelf(
    @CurrentUser() u: JwtPayload,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(SetBookshelfSchema)) dto: SetBookshelfDto,
  ) {
    return this.shelves.setItemBookshelf(u.sub, itemId, dto);
  }

  @Delete("items/:itemId/bookshelf/manual-override")
  @HttpCode(HttpStatus.NO_CONTENT)
  clearOverride(@CurrentUser() u: JwtPayload, @Param("itemId") itemId: string) {
    return this.shelves.clearItemBookshelfOverride(u.sub, itemId);
  }
}
