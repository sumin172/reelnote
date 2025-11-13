import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { CatalogPrismaAccessor } from "./catalog-prisma.accessor.js";

@Module({
  imports: [DatabaseModule],
  providers: [CatalogPrismaAccessor],
  exports: [CatalogPrismaAccessor],
})
export class CatalogPrismaModule {}
