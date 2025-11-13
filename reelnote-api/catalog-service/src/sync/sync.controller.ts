import { Controller, Post, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { SyncService } from "./sync.service.js";

@ApiTags("sync")
@Controller("sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("trending")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "트렌딩 영화 동기화",
    description: "TMDB 트렌딩 영화를 가져와서 로컬 DB에 저장/업데이트합니다.",
  })
  @ApiQuery({
    name: "timeWindow",
    required: false,
    enum: ["day", "week"],
    description: "기간 (기본: day)",
  })
  @ApiResponse({ status: 200, description: "동기화 성공" })
  async syncTrending(
    @Query("timeWindow") timeWindow: "day" | "week" = "day",
  ): Promise<{ message: string }> {
    await this.syncService.syncTrending(timeWindow);
    return { message: "트렌딩 영화 동기화 완료" };
  }

  @Post("popular")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "인기 영화 동기화",
    description: "TMDB 인기 영화를 가져와서 로컬 DB에 저장/업데이트합니다.",
  })
  @ApiResponse({ status: 200, description: "동기화 성공" })
  async syncPopular(): Promise<{ message: string }> {
    await this.syncService.syncPopular();
    return { message: "인기 영화 동기화 완료" };
  }
}
