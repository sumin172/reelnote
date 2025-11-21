import { Injectable, Logger } from "@nestjs/common";
import { TmdbClient } from "./tmdb.client.js";
import type { TmdbMovieListResponse } from "./tmdb.types.js";
import { ExceptionFactoryService } from "../common/error/exception-factory.service.js";

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);

  constructor(
    private readonly tmdbClient: TmdbClient,
    private readonly exceptionFactory: ExceptionFactoryService,
  ) {}

  async searchMovies(query: string, page = 1, language = "ko-KR") {
    this.logger.log(`영화 검색: query=${query}, page=${page}`);
    return this.tmdbClient.searchMovies(query, page, language);
  }

  async getMovieDetail(tmdbId: number, language = "ko-KR") {
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      this.logger.warn(`유효하지 않은 TMDB ID 요청: tmdbId=${tmdbId}`);
      throw this.exceptionFactory.validationError(
        "유효하지 않은 TMDB ID 입니다. 양의 정수를 입력해주세요.",
      );
    }
    this.logger.log(`영화 상세 조회: tmdbId=${tmdbId}`);
    return this.tmdbClient.getMovieDetail(tmdbId, language);
  }

  async getPopularMovies(
    page = 1,
    language = "ko-KR",
  ): Promise<TmdbMovieListResponse> {
    this.logger.log(`인기 영화 조회: page=${page}`);
    return this.tmdbClient.getPopularMovies<TmdbMovieListResponse>(
      page,
      language,
    );
  }

  async getTrendingMovies(
    timeWindow: "day" | "week" = "day",
    page = 1,
  ): Promise<TmdbMovieListResponse> {
    this.logger.log(`트렌딩 영화 조회: timeWindow=${timeWindow}, page=${page}`);
    return this.tmdbClient.getTrendingMovies<TmdbMovieListResponse>(
      timeWindow,
      page,
    );
  }
}
