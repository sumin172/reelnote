import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { CatalogPrismaModule } from "../infrastructure/db/catalog-prisma.module.js";

@Module({
  imports: [CatalogPrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
