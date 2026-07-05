/**
 * Standalone list view endpoints that sit outside /items/:id:
 *   GET /library-inbox
 *   GET /reading-list
 *   GET /archive
 */
import { Controller, Get } from "@nestjs/common";
import { LibraryItemsService } from "./library-items.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";

@Controller()
export class ViewsController {
  constructor(private items: LibraryItemsService) {}

  @Get("library-inbox")
  inbox(@CurrentUser() u: JwtPayload) {
    return this.items.inbox(u.sub);
  }

  @Get("reading-list")
  readingList(@CurrentUser() u: JwtPayload) {
    return this.items.readingList(u.sub);
  }

  @Get("archive")
  archive(@CurrentUser() u: JwtPayload) {
    return this.items.archiveList(u.sub);
  }
}
