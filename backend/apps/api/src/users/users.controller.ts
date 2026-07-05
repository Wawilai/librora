import { Controller, Get, Patch, Delete, Body, HttpCode, HttpStatus } from "@nestjs/common";
import {
  UsersService,
  UpdateUserSchema,
  UpdateUserDto,
  DeleteAccountSchema,
  DeleteAccountDto,
} from "./users.service";
import { CurrentUser, JwtPayload } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Get("me")
  me(@CurrentUser() u: JwtPayload) {
    return this.users.me(u.sub);
  }

  @Patch("me")
  update(
    @CurrentUser() u: JwtPayload,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.users.update(u.sub, dto);
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(
    @CurrentUser() u: JwtPayload,
    @Body(new ZodValidationPipe(DeleteAccountSchema)) dto: DeleteAccountDto,
  ) {
    return this.users.deactivate(u.sub, dto);
  }
}
