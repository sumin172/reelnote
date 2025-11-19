import {Injectable, Logger} from "@nestjs/common";
import {CatalogPrismaAccessor} from "../infrastructure/db/catalog-prisma.accessor.js";
import {VersionService} from "./version.service.js";
import {HealthMetricsService} from "./health-metrics.service.js";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly serviceName = "catalog-service";

  constructor(
    private readonly catalogPrisma: CatalogPrismaAccessor,
    private readonly versionService: VersionService,
    private readonly healthMetrics: HealthMetricsService,
  ) {}

  /**
   * Readiness 체크 (DB 연결 확인)
   */
  async readiness() {
    try {
      // DB 연결 테스트 (PrismaClient의 메서드 사용)
      await this.catalogPrisma.ensureConnection();
      // 간단한 쿼리로 연결 확인
      await this.catalogPrisma.countMovies();

      return {
        status: "UP" as const,
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        checks: {
          database: "UP" as const,
        },
        version: this.versionService.getVersion(),
      };
    } catch (error) {
      // 실패 시에만 로그 및 메트릭 기록
      this.logger.warn(
        "Readiness check failed: database check failed",
        error instanceof Error ? error.stack : error,
      );
      this.healthMetrics.incrementFailure("ready", "database");

      return {
        status: "DOWN" as const,
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        checks: {
          database: "DOWN" as const,
        },
        version: this.versionService.getVersion(),
      };
    }
  }

  /**
   * Liveness 체크 (서비스가 살아있는지)
   */
  async liveness() {
    return {
      status: "UP" as const,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      version: this.versionService.getVersion(),
    };
  }
}
