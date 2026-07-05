import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { v4 as uuidv4 } from "uuid";

export interface ApiResponse<T> {
  data: T;
  meta: { requestId: string };
}

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // Binary responses (file exports via @Res({ passthrough: true }))
        // must reach the client as-is — wrapping a Buffer in the JSON
        // envelope would corrupt it.
        if (Buffer.isBuffer(data)) return data;
        return { data, meta: { requestId: uuidv4() } };
      }),
    );
  }
}
