import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service.js";

@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * K8s Liveness Probe용 엔드포인트
   */
  @Get("health/live")
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
}
