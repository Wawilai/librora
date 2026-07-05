import { PipeTransform, BadRequestException } from "@nestjs/common";
import { ZodSchema } from "zod";

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: result.error.issues.map((i) => i.message).join("; "),
        details: result.error.issues,
      });
    }
    return result.data;
  }
}
