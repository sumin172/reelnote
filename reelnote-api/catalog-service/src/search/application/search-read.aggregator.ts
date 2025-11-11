import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';
import { SearchLocalReadAdapter } from '../infrastructure/search-local.read.adapter';
import { SearchTmdbReadAdapter } from '../infrastructure/search-tmdb.read.adapter';
import { SearchQuery, SearchReadPort, SearchResult } from './search-read.port';

const SEARCH_CACHE_TTL_SECONDS = 60;

@Injectable()
export class SearchReadAggregator extends SearchReadPort {
  private readonly logger = new Logger(SearchReadAggregator.name);

  constructor(
    private readonly localAdapter: SearchLocalReadAdapter,
    private readonly tmdbAdapter: SearchTmdbReadAdapter,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const normalizedQuery = query.query?.trim();
    if (!normalizedQuery) {
      throw new BadRequestException('검색어(q)는 필수입니다.');
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const language = query.language ?? 'ko-KR';
    const cacheKey = this.createCacheKey(normalizedQuery, page, language);

    const cached = await this.cacheService.get<SearchResult>(cacheKey);
    if (cached) {
      this.logger.debug(`검색 결과 캐시 반환: ${cacheKey}`);
      return cached;
    }

    const [local, tmdb] = await Promise.all([
      this.localAdapter.search(normalizedQuery, page),
      this.tmdbAdapter.search(normalizedQuery, page, language),
    ]);

    const localTmdbIds = new Set(local.map(movie => movie.tmdbId));
    const filteredTmdb = tmdb.filter(movie => !localTmdbIds.has(movie.tmdbId));

    const result: SearchResult = {
      query: normalizedQuery,
      page,
      local,
      tmdb: filteredTmdb,
    };

    await this.cacheService.set(cacheKey, result, SEARCH_CACHE_TTL_SECONDS);

    return result;
  }

  private createCacheKey(query: string, page: number, language: string): string {
    return `search:${query}:${page}:${language}`;
  }
}

