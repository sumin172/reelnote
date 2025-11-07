import { Injectable, Logger } from '@nestjs/common';
import { MoviesFacade } from '../movies/application/movies.facade';
import { TmdbService } from '../tmdb/tmdb.service';
import { ConfigService } from '@nestjs/config';

/**
 * 동기화 서비스
 * - Warm Pool: 트렌딩/인기 Top N 주기적 동기화
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly warmPoolSize: number;

  constructor(
    private readonly moviesFacade: MoviesFacade,
    private readonly tmdbService: TmdbService,
    private readonly configService: ConfigService,
  ) {
    this.warmPoolSize = this.configService.get<number>('WARM_POOL_SIZE', 100);
  }

  /**
   * 트렌딩 영화 동기화
   */
  async syncTrending(timeWindow: 'day' | 'week' = 'day'): Promise<void> {
    this.logger.log(`트렌딩 영화 동기화 시작: ${timeWindow}`);

    try {
      const pagesToSync = Math.ceil(this.warmPoolSize / 20); // TMDB는 페이지당 20개

      const allTmdbIds: number[] = [];

      for (let page = 1; page <= pagesToSync; page++) {
        const response: any = await this.tmdbService.getTrendingMovies(timeWindow, page);
        const tmdbIds = response.results?.map((movie: any) => movie.id) || [];
        allTmdbIds.push(...tmdbIds);

        if (allTmdbIds.length >= this.warmPoolSize) {
          break;
        }
      }

      // 상위 N개만 동기화
      const idsToSync = allTmdbIds.slice(0, this.warmPoolSize);

      this.logger.log(`트렌딩 영화 ${idsToSync.length}개 동기화 시작`);
      await this.moviesFacade.importMovies(idsToSync);

      this.logger.log(`트렌딩 영화 동기화 완료`);
    } catch (error) {
      this.logger.error('트렌딩 영화 동기화 실패', error);
      throw error;
    }
  }

  /**
   * 인기 영화 동기화
   */
  async syncPopular(): Promise<void> {
    this.logger.log('인기 영화 동기화 시작');

    try {
      const pagesToSync = Math.ceil(this.warmPoolSize / 20);

      const allTmdbIds: number[] = [];

      for (let page = 1; page <= pagesToSync; page++) {
        const response: any = await this.tmdbService.getPopularMovies(page);
        const tmdbIds = response.results?.map((movie: any) => movie.id) || [];
        allTmdbIds.push(...tmdbIds);

        if (allTmdbIds.length >= this.warmPoolSize) {
          break;
        }
      }

      const idsToSync = allTmdbIds.slice(0, this.warmPoolSize);

      this.logger.log(`인기 영화 ${idsToSync.length}개 동기화 시작`);
      await this.moviesFacade.importMovies(idsToSync);

      this.logger.log('인기 영화 동기화 완료');
    } catch (error) {
      this.logger.error('인기 영화 동기화 실패', error);
      throw error;
    }
  }
}

