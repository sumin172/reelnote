import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Movie 설정 Provider
 *
 * 환경 변수 검증이 완료된 ConfigService를 기반으로
 * 타입 안전한 Movie 설정을 제공합니다.
 */
@Injectable()
export class MovieConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 영화 데이터 Stale Threshold (일)
   * 기본값: 7일
   */
  get staleThresholdDays(): number {
    return (
      this.configService.get<number>("MOVIE_STALE_THRESHOLD_DAYS", {
        infer: true,
      }) ?? 7
    );
  }

  /**
   * 영화 캐시 TTL (초)
   * 기본값: 3600 (1시간)
   */
  get cacheTtlSeconds(): number {
    return (
      this.configService.get<number>("MOVIE_CACHE_TTL_SECONDS", {
        infer: true,
      }) ?? 3600
    );
  }

  /**
   * 영화 Import 동시성 제한
   * 기본값: 5
   */
  get importConcurrency(): number {
    const value = this.configService.get<number>("MOVIE_IMPORT_CONCURRENCY", {
      infer: true,
    });
    return value && value > 0 ? Math.floor(value) : 5;
  }

  /**
   * 영화 Import 큐 임계값
   * 이 값 이상이면 비동기 큐로 처리
   * 기본값: 50
   */
  get importQueueThreshold(): number {
    const value = this.configService.get<number>(
      "MOVIE_IMPORT_QUEUE_THRESHOLD",
      { infer: true },
    );
    return value && value > 0 ? Math.floor(value) : 50;
  }

  /**
   * 영화 Import 청크 크기
   * 기본값: 100
   */
  get importChunkSize(): number {
    const value = this.configService.get<number>("MOVIE_IMPORT_CHUNK_SIZE", {
      infer: true,
    });
    return value && value > 0 ? Math.floor(value) : 100;
  }
}
