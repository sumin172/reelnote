import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { MoviesFacade } from "./application/movies.facade.js";
import {
  ImportMoviesDto,
  ImportMoviesImmediateResponseDto,
  ImportMoviesJobDetailDto,
  ImportMoviesJobSummaryDto,
  MovieResponseDto,
} from "./dto/movie.dto.js";

@ApiTags("movies")
@Controller("movies")
export class MoviesController {
  constructor(private readonly moviesFacade: MoviesFacade) {}

  @Get(":tmdbId")
  @ApiOperation({
    summary: "영화 상세 조회",
    description:
      "TMDB ID로 영화 상세 정보를 조회합니다. 로컬 캐시 미스 시 TMDB에서 가져와 저장합니다.",
  })
  @ApiParam({ name: "tmdbId", description: "TMDB 영화 ID", type: Number })
  @ApiQuery({
    name: "language",
    required: false,
    description: "언어 코드 (기본: ko-KR)",
  })
  @ApiResponse({
    status: 200,
    description: "영화 정보 조회 성공",
    type: MovieResponseDto,
  })
  @ApiResponse({ status: 404, description: "영화를 찾을 수 없음" })
  async getMovie(
    @Param("tmdbId") tmdbId: number,
    @Query("language") language = "ko-KR",
  ): Promise<MovieResponseDto> {
    return this.moviesFacade.getMovie(tmdbId, language);
  }

  @Post("import")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "영화 일괄 인입",
    description: "여러 영화를 TMDB에서 가져와 저장/업데이트합니다.",
  })
  @ApiResponse({
    status: 200,
    description: "소량 인입 즉시 완료",
    type: ImportMoviesImmediateResponseDto,
  })
  @ApiResponse({
    status: 202,
    description: "대량 인입 비동기 처리",
    type: ImportMoviesJobSummaryDto,
  })
  async importMovies(
    @Body() dto: ImportMoviesDto,
  ): Promise<ImportMoviesImmediateResponseDto> {
    const language = dto.language ?? "ko-KR";
    const result = await this.moviesFacade.importMovies({
      tmdbIds: dto.tmdbIds ?? [],
      language,
      resumeJobId: dto.resumeJobId,
    });

    if (result.kind === "queued") {
      throw new HttpException(result.job, HttpStatus.ACCEPTED);
    }

    return result.result;
  }

  @Get("import/jobs/:jobId")
  @ApiOperation({
    summary: "영화 일괄 인입 작업 조회",
    description: "비동기 영화 인입 작업의 진행 상태와 결과를 확인합니다.",
  })
  @ApiParam({ name: "jobId", description: "작업 ID" })
  @ApiResponse({
    status: 200,
    description: "작업 상세 정보",
    type: ImportMoviesJobDetailDto,
  })
  async getImportJob(
    @Param("jobId") jobId: string,
  ): Promise<ImportMoviesJobDetailDto> {
    const { detail, movies, failures } = this.moviesFacade.getImportJob(jobId);

    return {
      jobId: detail.jobId,
      status: detail.status,
      total: detail.total,
      processed: detail.processed,
      succeeded: detail.succeeded,
      failed: detail.failed,
      requestedAt: detail.requestedAt,
      completedAt: detail.completedAt,
      movies,
      failures,
      error: detail.error,
    };
  }
}
