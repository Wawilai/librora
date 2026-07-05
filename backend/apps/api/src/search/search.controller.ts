import { Controller, Get, Post, Query, Body } from "@nestjs/common";
import { SearchService } from "./search.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { z } from "zod";

const SemanticSchema = z.object({
  q: z.string().trim().min(1),
  limit: z.number().int().min(1).max(50).optional(),
});

@Controller("search")
export class SearchController {
  constructor(private search: SearchService) {}

  @Get("keyword")
  keyword(
    @CurrentUser() u: JwtPayload,
    @Query("q") q: string,
    @Query("limit") limit?: string,
  ) {
    return this.search.keyword(u.sub, q, limit ? parseInt(limit) : undefined);
  }

  @Post("semantic")
  semantic(
    @CurrentUser() u: JwtPayload,
    @Body(new ZodValidationPipe(SemanticSchema)) body: { q: string; limit?: number },
  ) {
    return this.search.semantic(u.sub, body.q, body.limit);
  }
}
