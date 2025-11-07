import { Injectable, Logger } from '@nestjs/common';
import { CatalogCorePrismaService } from '../database/catalog-core/catalog-core.prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly catalogCorePrisma: CatalogCorePrismaService,
    private readonly tmdbService: TmdbService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 영화 검색
   * 1. 로컬 DB에서 검색 시도
   * 2. 필요 시 TMDB 검색 결과도 포함
   */
  async search(query: string, page: number = 1, language: string = 'ko-KR') {
    this.logger.log(`영화 검색: query=${query}, page=${page}`);

    // 캐시 확인
    const cacheKey = `search:${query}:${page}:${language}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 로컬 DB 검색 (제목 기반)
    const localResults = await this.catalogCorePrisma.movie.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { originalTitle: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        genres: { include: { genre: true } },
        keywords: { include: { keyword: true } },
      },
      take: 20,
      skip: (page - 1) * 20,
    });

    // TMDB 검색 (더 넓은 결과)
    let tmdbResults: any[] = [];
    try {
      const tmdbResponse: any = await this.tmdbService.searchMovies(query, page, language);
      tmdbResults = tmdbResponse.results || [];
    } catch (error) {
      this.logger.warn('TMDB 검색 실패, 로컬 결과만 반환', error);
    }

    // 결과 병합 및 중복 제거
    const result = {
      local: localResults.map(movie => ({
        tmdbId: movie.tmdbId,
        title: movie.title,
        originalTitle: movie.originalTitle,
        posterPath: movie.posterPath,
        year: movie.year,
        genres: movie.genres.map(mg => mg.genre.name),
      })),
      tmdb: tmdbResults.map((movie: any) => ({
        tmdbId: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        posterPath: movie.poster_path,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        genres: movie.genre_ids || [],
      })),
      page,
      query,
    };

    // 캐시 저장 (5분)
    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }
}

