import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QdrantInitService } from "./qdrant-init.service";

@Module({
  imports: [ConfigModule],
  providers: [QdrantInitService],
})
export class QdrantModule {}
