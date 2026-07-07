import { Module } from "@nestjs/common";
import { SetupController } from "./setup.controller";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [QueueModule],
  controllers: [SetupController],
})
export class SetupModule {}
