import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { VersionService } from "./version.service.js";
import { HealthMetricsService } from "./health-metrics.service.js";
import { CatalogPrismaModule } from "../infrastructure/db/catalog-prisma.module.js";

@Module({
  imports: [CatalogPrismaModule],
  controllers: [HealthController],
  providers: [HealthService, VersionService, HealthMetricsService],
})
export class HealthModule {}
