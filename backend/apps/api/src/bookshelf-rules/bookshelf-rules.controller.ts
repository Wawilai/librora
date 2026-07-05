import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from "@nestjs/common";
import {
  BookshelfRulesService,
  CreateRuleSchema,
  CreateRuleDto,
  UpdateRuleSchema,
  UpdateRuleDto,
} from "./bookshelf-rules.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("bookshelf-rules")
export class BookshelfRulesController {
  constructor(private rules: BookshelfRulesService) {}

  @Get()
  list(@CurrentUser() u: JwtPayload) {
    return this.rules.list(u.sub);
  }

  @Post()
  create(
    @CurrentUser() u: JwtPayload,
    @Body(new ZodValidationPipe(CreateRuleSchema)) dto: CreateRuleDto,
  ) {
    return this.rules.create(u.sub, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() u: JwtPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateRuleSchema)) dto: UpdateRuleDto,
  ) {
    return this.rules.update(u.sub, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.rules.remove(u.sub, id);
  }

  @Post(":id/apply")
  applyNow(@CurrentUser() u: JwtPayload, @Param("id") id: string) {
    return this.rules.applyNow(u.sub, id);
  }
}
