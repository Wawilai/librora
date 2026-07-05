import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fastifyCookie = require("@fastify/cookie");
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV === "development",
      // Read the real client IP from X-Forwarded-For behind Railway's proxy —
      // without this, IpThrottlerGuard (see auth/register's rate limit) would
      // key every request on the proxy's own address instead of the client's.
      trustProxy: true,
    }),
    { rawBody: true }, // needed for Stripe webhook signature verification
  );

  // Requests with Content-Type: application/json but an empty body (e.g. POST
  // /auth/refresh, POST /auth/logout) must not 400 — the default parser installed
  // by `rawBody: true` rejects empty JSON bodies. Replace it with one that both
  // keeps capturing req.rawBody (needed for Stripe webhook signature verification)
  // and tolerates an empty body.
  app.useBodyParser(
    "application/json",
    {},
    (_req: unknown, body: Buffer, done: (err: Error | null, body?: unknown) => void) => {
      if (body.length === 0) return done(null, undefined);
      try {
        done(null, JSON.parse(body.toString("utf8")));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // Cookies (for Refresh Token HttpOnly)
  await app.register(fastifyCookie, {
    secret: process.env.JWT_REFRESH_SECRET,
  });

  // CORS — allow the web app, plus the Library Clipper extension's origin if
  // configured. Note: the extension's background service worker (which owns all
  // its API calls, see extension/src/lib/api.ts) is not subject to page-context
  // CORS the way a tab-hosted fetch is — this entry mainly guards against any
  // future page-context call from the extension's own popup/UI.
  const allowedOrigins = [
    process.env.WEB_BASE_URL ?? "http://localhost:5173",
    process.env.EXTENSION_ORIGIN,
  ].filter((origin): origin is string => !!origin);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  });

  // Global prefix
  app.setGlobalPrefix("api/v1");

  // Global response envelope + exception filter
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = parseInt(process.env.API_PORT ?? process.env.PORT ?? "3001", 10);
  await app.listen(port, "0.0.0.0");
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
