import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Sync 설정 Provider
 *
 * 환경 변수 검증이 완료된 ConfigService를 기반으로
 * 타입 안전한 Sync 설정을 제공합니다.
 */
@Injectable()
export class SyncConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Warm Pool 크기
   * 기본값: 100
   */
  get warmPoolSize(): number {
    return (
      this.configService.get<number>("WARM_POOL_SIZE", { infer: true }) ?? 100
    );
  }
}
