import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: "헬스체크",
    description: "서비스 상태를 확인합니다.",
  })
  @ApiResponse({ status: 200, description: "서비스 정상" })
  async health() {
    return this.healthService.check();
  }

  @Get("ready")
  @ApiOperation({
    summary: "Readiness 체크",
    description: "서비스가 트래픽을 받을 준비가 되었는지 확인합니다.",
  })
  @ApiResponse({ status: 200, description: "준비 완료" })
  @ApiResponse({ status: 503, description: "준비되지 않음" })
  async readiness() {
    return this.healthService.readiness();
  }

  @Get("live")
  @ApiOperation({
    summary: "Liveness 체크",
    description: "서비스가 살아있는지 확인합니다.",
  })
  @ApiResponse({ status: 200, description: "서비스 활성" })
  async liveness() {
    return this.healthService.liveness();
  }
}
