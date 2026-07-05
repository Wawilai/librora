import { Catch, ArgumentsHost, HttpException, HttpStatus, ExceptionFilter } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { FastifyReply } from "fastify";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttp ? exception.getResponse() : null;
    const code =
      typeof exceptionResponse === "object" && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>)["code"] ?? "INTERNAL_SERVER_ERROR"
        : "INTERNAL_SERVER_ERROR";

    const message =
      isHttp
        ? typeof exceptionResponse === "string"
          ? exceptionResponse
          : ((exceptionResponse as Record<string, unknown>)["message"] ?? "An error occurred")
        : "Internal server error";

    void reply.code(status).send({
      error: {
        code,
        message,
        details: null,
      },
      meta: {
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
