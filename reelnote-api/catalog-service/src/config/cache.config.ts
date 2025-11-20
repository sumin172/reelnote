import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Cache 설정 Provider
 *
 * 환경 변수 검증이 완료된 ConfigService를 기반으로
 * 타입 안전한 Cache 설정을 제공합니다.
 */
@Injectable()
export class CacheConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Redis URL (선택적)
   * 빈 문자열이거나 undefined일 수 있음
   */
  get redisUrl(): string | undefined {
    const url = this.configService.get<string>("REDIS_URL", { infer: true });
    return url && url.trim() !== "" ? url : undefined;
  }

  /**
   * Cache TTL (초)
   * 기본값: 3600 (1시간)
   */
  get ttlSeconds(): number {
    return (
      this.configService.get<number>("CACHE_TTL_SECONDS", { infer: true }) ??
      3600
    );
  }

  /**
   * Cache TTL (밀리초)
   * ttlSeconds를 밀리초로 변환한 값
   */
  get ttlMs(): number | undefined {
    const seconds = this.ttlSeconds;
    if (seconds > 0) {
      return seconds * 1000;
    }
    return undefined;
  }

  /**
   * Cache Namespace
   * 기본값: catalog-cache
   */
  get namespace(): string {
    return (
      this.configService.get<string>("CACHE_NAMESPACE", { infer: true }) ??
      "catalog-cache"
    );
  }
}
