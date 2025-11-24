import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { isSchemaGeneration } from "../config/schema-generation.js";

/**
 * Prisma 데이터베이스 서비스
 *
 * PrismaClient를 확장하여 NestJS 생명주기와 통합합니다.
 *
 * ⚠️ 프로덕션 주의사항:
 * - OpenAPI 스키마 생성 시에만 DB 연결을 건너뜁니다.
 * - `SKIP_ENV_VALIDATION=true` 플래그는 프로덕션 환경에서 절대 설정되어서는 안 됩니다.
 * - CI/CD 파이프라인에서 이 값이 설정되지 않았는지 확인하세요.
 * - 배포용 npm 스크립트에서는 이 플래그를 건드리지 않도록 주의하세요.
 *
 * @see isSchemaGeneration - 스키마 생성 모드 확인 헬퍼
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * 모듈 초기화 시 데이터베이스 연결
   *
   * OpenAPI 스키마 생성 시에는 데이터베이스 연결을 건너뜁니다.
   * 이는 스키마 생성 시 실제 DB 연결이 필요하지 않기 때문입니다.
   *
   * ⚠️ 주의: 프로덕션 환경에서는 이 플래그가 절대 설정되지 않아야 합니다.
   * CI/CD 파이프라인에서 이 값이 설정되지 않았는지 확인하세요.
   */
  async onModuleInit() {
    // OpenAPI 생성 시에는 데이터베이스 연결을 건너뜀
    if (isSchemaGeneration()) {
      this.logger.log("Skipping database connection for OpenAPI generation");
      return;
    }
    await this.$connect();
    this.logger.log("Database connected");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Database disconnected");
  }
}
