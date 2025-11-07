import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TmdbClient } from './tmdb.client';

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);

  constructor(private readonly tmdbClient: TmdbClient) {}

  async searchMovies(query: string, page: number = 1, language: string = 'ko-KR') {
    this.logger.log(`영화 검색: query=${query}, page=${page}`);
    return this.tmdbClient.searchMovies(query, page, language);
  }

  async getMovieDetail(tmdbId: number, language: string = 'ko-KR') {
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      this.logger.warn(`유효하지 않은 TMDB ID 요청: tmdbId=${tmdbId}`);
      throw new BadRequestException('유효하지 않은 TMDB ID 입니다. 양의 정수를 입력해주세요.');
    }
    this.logger.log(`영화 상세 조회: tmdbId=${tmdbId}`);
    return this.tmdbClient.getMovieDetail(tmdbId, language);
  }

  async getPopularMovies(page: number = 1, language: string = 'ko-KR') {
    this.logger.log(`인기 영화 조회: page=${page}`);
    return this.tmdbClient.getPopularMovies(page, language);
  }

  async getTrendingMovies(timeWindow: 'day' | 'week' = 'day', page: number = 1) {
    this.logger.log(`트렌딩 영화 조회: timeWindow=${timeWindow}, page=${page}`);
    return this.tmdbClient.getTrendingMovies(timeWindow, page);
  }
}

