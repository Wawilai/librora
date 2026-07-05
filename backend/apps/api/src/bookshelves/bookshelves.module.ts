import { Module } from "@nestjs/common";
import { BookshelvesService } from "./bookshelves.service";
import { BookshelvesController } from "./bookshelves.controller";

@Module({
  providers: [BookshelvesService],
  controllers: [BookshelvesController],
  exports: [BookshelvesService],
})
export class BookshelvesModule {}
