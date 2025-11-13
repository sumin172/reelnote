import { Injectable, Logger } from "@nestjs/common";
import { CatalogPrismaAccessor } from "../infrastructure/db/catalog-prisma.accessor.js";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly catalogPrisma: CatalogPrismaAccessor) {}

  /**
   * 기본 헬스체크
   */
  async check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "catalog-service",
    };
  }

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
        status: "ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: "ok",
        },
      };
    } catch (error) {
      this.logger.error("Readiness check failed", error);
      return {
        status: "not ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: "error",
        },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Liveness 체크 (서비스가 살아있는지)
   */
  async liveness() {
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
    };
  }
}
