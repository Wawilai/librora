import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  jti: string; // token id
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return (request as FastifyRequest & { user: JwtPayload }).user;
  },
);
