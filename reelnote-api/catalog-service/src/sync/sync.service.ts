import { Injectable, Logger } from "@nestjs/common";
import { MoviesFacade } from "../movies/application/movies.facade.js";
import { TmdbService } from "../tmdb/tmdb.service.js";
import type { TmdbMovieListResponse } from "../tmdb/tmdb.types.js";
import { SyncConfig } from "../config/sync.config.js";

/**
 * 동기화 서비스
 * - Warm Pool: 트렌딩/인기 Top N 주기적 동기화
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly moviesFacade: MoviesFacade,
    private readonly tmdbService: TmdbService,
    private readonly syncConfig: SyncConfig,
  ) {}

  private get warmPoolSize(): number {
    return this.syncConfig.warmPoolSize;
  }

  /**
   * 트렌딩 영화 동기화
   */
  async syncTrending(timeWindow: "day" | "week" = "day"): Promise<void> {
    this.logger.log(`트렌딩 영화 동기화 시작: ${timeWindow}`);

    try {
      const pagesToSync = Math.ceil(this.warmPoolSize / 20); // TMDB는 페이지당 20개

      const allTmdbIds: number[] = [];

      for (let page = 1; page <= pagesToSync; page++) {
        const response: TmdbMovieListResponse =
          await this.tmdbService.getTrendingMovies(timeWindow, page);
        const tmdbIds = response.results?.map((movie) => movie.id) ?? [];
        allTmdbIds.push(...tmdbIds);

        if (allTmdbIds.length >= this.warmPoolSize) {
          break;
        }
      }

      // 상위 N개만 동기화
      const idsToSync = allTmdbIds.slice(0, this.warmPoolSize);

      this.logger.log(`트렌딩 영화 ${idsToSync.length}개 동기화 시작`);
      const result = await this.moviesFacade.importMovies({
        tmdbIds: idsToSync,
        language: "ko-KR",
      });

      if (result.kind === "queued") {
        this.logger.log(
          `트렌딩 영화 동기화가 비동기 작업으로 전환되었습니다 (jobId=${result.job.jobId}).`,
        );
      } else {
        this.logger.log(
          `트렌딩 영화 동기화 완료 (성공 ${result.result.movies.length}, 실패 ${result.result.failures.length})`,
        );
      }
    } catch (error) {
      this.logger.error("트렌딩 영화 동기화 실패", error);
      throw error;
    }
  }

  /**
   * 인기 영화 동기화
   */
  async syncPopular(): Promise<void> {
    this.logger.log("인기 영화 동기화 시작");

    try {
      const pagesToSync = Math.ceil(this.warmPoolSize / 20);

      const allTmdbIds: number[] = [];

      for (let page = 1; page <= pagesToSync; page++) {
        const response: TmdbMovieListResponse =
          await this.tmdbService.getPopularMovies(page);
        const tmdbIds = response.results?.map((movie) => movie.id) ?? [];
        allTmdbIds.push(...tmdbIds);

        if (allTmdbIds.length >= this.warmPoolSize) {
          break;
        }
      }

      const idsToSync = allTmdbIds.slice(0, this.warmPoolSize);

      this.logger.log(`인기 영화 ${idsToSync.length}개 동기화 시작`);
      const result = await this.moviesFacade.importMovies({
        tmdbIds: idsToSync,
        language: "ko-KR",
      });

      if (result.kind === "queued") {
        this.logger.log(
          `인기 영화 동기화가 비동기 작업으로 전환되었습니다 (jobId=${result.job.jobId}).`,
        );
      } else {
        this.logger.log(
          `인기 영화 동기화 완료 (성공 ${result.result.movies.length}, 실패 ${result.result.failures.length})`,
        );
      }
    } catch (error) {
      this.logger.error("인기 영화 동기화 실패", error);
      throw error;
    }
  }
}
