import { Injectable } from "@nestjs/common";

/**
 * Health Check 메트릭 서비스
 * 헬스 체크 실패 카운터를 관리
 *
 * TODO: 나중에 Prometheus 연동 시 이 서비스를 Prometheus 메트릭으로 교체
 */
@Injectable()
export class HealthMetricsService {
  private readonly failureCounters = new Map<string, number>();

  /**
   * 헬스 체크 실패 카운터 증가
   */
  incrementFailure(endpoint: string, check?: string): void {
    const key = check ? `${endpoint}:${check}` : endpoint;
    const current = this.failureCounters.get(key) || 0;
    this.failureCounters.set(key, current + 1);
  }

  /**
   * 헬스 체크 실패 카운터 조회
   */
  getFailureCount(endpoint: string, check?: string): number {
    const key = check ? `${endpoint}:${check}` : endpoint;
    return this.failureCounters.get(key) || 0;
  }

  /**
   * 모든 메트릭 조회 (디버깅용)
   */
  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.failureCounters.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
