import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Res,
  Version,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import type { Response } from "express";
import { HealthService } from "./health.service.js";
import { HealthMetricsService } from "./health-metrics.service.js";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly healthMetrics: HealthMetricsService,
  ) {}

  /**
   * K8s Liveness Probe용 엔드포인트
   */
  @Get("health/live")
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Liveness 체크",
    description: "서비스가 살아있는지 확인합니다 (K8s liveness probe용)",
  })
  @ApiResponse({ status: 200, description: "서비스 활성" })
  async liveness() {
    return this.healthService.liveness();
  }

  /**
   * K8s Readiness Probe용 엔드포인트
   */
  @Get("health/ready")
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Readiness 체크",
    description:
      "서비스가 트래픽을 받을 준비가 되었는지 확인합니다 (K8s readiness probe용)",
  })
  @ApiResponse({ status: 200, description: "준비 완료" })
  @ApiResponse({ status: 503, description: "준비되지 않음" })
  async readiness() {
    const result = await this.healthService.readiness();
    // status가 DOWN이면 503 반환
    if (result.status === "DOWN") {
      return { ...result, statusCode: HttpStatus.SERVICE_UNAVAILABLE };
    }
    return result;
  }

  /**
   * Prometheus 메트릭 엔드포인트
   */
  @Get("metrics")
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Prometheus 메트릭",
    description: "Prometheus 스크래핑용 메트릭 엔드포인트",
  })
  @ApiResponse({ status: 200, description: "메트릭 데이터 (text/plain)" })
  async metrics(@Res() res: Response) {
    const registry = this.healthMetrics.getRegistry();
    res.set("Content-Type", registry.contentType);
    const metrics = await registry.metrics();
    res.send(metrics);
  }
}
