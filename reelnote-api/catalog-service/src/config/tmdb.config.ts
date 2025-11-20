import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * TMDB API 설정 Provider
 *
 * 환경 변수 검증이 완료된 ConfigService를 기반으로
 * 타입 안전한 TMDB 설정을 제공합니다.
 */
@Injectable()
export class TmdbConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * TMDB API Key (필수)
   */
  get apiKey(): string {
    return this.configService.get<string>("TMDB_API_KEY", { infer: true })!;
  }

  /**
   * TMDB API Base URL
   * 기본값: https://api.themoviedb.org/3
   */
  get baseUrl(): string {
    return (
      this.configService.get<string>("TMDB_API_BASE_URL", { infer: true }) ??
      "https://api.themoviedb.org/3"
    );
  }

  /**
   * TMDB API Timeout (ms)
   * 기본값: 10000 (10초)
   */
  get timeout(): number {
    return (
      this.configService.get<number>("TMDB_API_TIMEOUT", { infer: true }) ??
      10000
    );
  }

  /**
   * 최대 동시 요청 수
   * 기본값: 10
   */
  get maxConcurrency(): number {
    const value = this.configService.get<number>("TMDB_API_MAX_CONCURRENCY", {
      infer: true,
    });
    return value && value > 0 ? Math.floor(value) : 10;
  }

  /**
   * 최대 재시도 횟수
   * 기본값: 3
   */
  get maxRetry(): number {
    const value = this.configService.get<number>("TMDB_API_MAX_RETRY", {
      infer: true,
    });
    return value && value >= 0 ? Math.floor(value) : 3;
  }

  /**
   * Circuit Breaker Timeout (ms)
   * 기본값: timeout + 1000
   */
  get breakerTimeout(): number {
    const value = this.configService.get<number>("TMDB_BREAKER_TIMEOUT", {
      infer: true,
    });
    return value && value > 0 ? value : this.timeout + 1000;
  }

  /**
   * Circuit Breaker Reset Timeout (ms)
   * 기본값: 60000 (1분)
   */
  get breakerResetTimeout(): number {
    return (
      this.configService.get<number>("TMDB_BREAKER_RESET_TIMEOUT", {
        infer: true,
      }) ?? 60000
    );
  }

  /**
   * Circuit Breaker Error Threshold Percentage
   * 기본값: 50
   */
  get breakerErrorPercentage(): number {
    return (
      this.configService.get<number>("TMDB_BREAKER_ERROR_PERCENTAGE", {
        infer: true,
      }) ?? 50
    );
  }

  /**
   * Circuit Breaker Volume Threshold
   * 기본값: 10
   */
  get breakerVolumeThreshold(): number {
    return (
      this.configService.get<number>("TMDB_BREAKER_VOLUME_THRESHOLD", {
        infer: true,
      }) ?? 10
    );
  }
}
