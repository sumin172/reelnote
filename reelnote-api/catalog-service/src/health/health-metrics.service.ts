import { Injectable } from "@nestjs/common";
import { Counter, Registry } from "prom-client";

/**
 * Health Check 메트릭 서비스
 * Prometheus Counter를 사용하여 헬스 체크 실패 카운터를 관리
 *
 * 메트릭 이름: health_check_failures_total
 * 라벨: service, endpoint, check (check는 선택적)
 */
@Injectable()
export class HealthMetricsService {
  private readonly registry: Registry;
  private readonly failureCounter: Counter<string>;
  private readonly serviceName = "catalog-service";

  constructor() {
    this.registry = new Registry();
    this.failureCounter = new Counter({
      name: "health_check_failures_total",
      help: "Total number of health check failures",
      labelNames: ["service", "endpoint", "check"],
      registers: [this.registry],
    });
  }

  /**
   * 헬스 체크 실패 카운터 증가
   * @param endpoint 엔드포인트 (예: "live", "ready")
   * @param check 체크 대상 (예: "database", "tmdb", "redis") - 선택적
   */
  incrementFailure(endpoint: string, check?: string): void {
    const labels: Record<string, string> = {
      service: this.serviceName,
      endpoint,
    };

    // check가 제공된 경우에만 라벨 추가
    if (check) {
      labels.check = check;
    }

    this.failureCounter.inc(labels);
  }

  /**
   * Prometheus Registry 반환 (메트릭 엔드포인트에서 사용)
   */
  getRegistry(): Registry {
    return this.registry;
  }
}
