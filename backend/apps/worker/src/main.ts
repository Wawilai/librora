import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  console.log("Worker started — listening for BullMQ jobs");
  app.enableShutdownHooks();
}

bootstrap();
