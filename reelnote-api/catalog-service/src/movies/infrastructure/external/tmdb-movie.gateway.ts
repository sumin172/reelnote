import { Injectable } from "@nestjs/common";
import { CacheService } from "../../../cache/cache.service.js";
import { TmdbService } from "../../../tmdb/tmdb.service.js";
import { MovieExternalPort } from "../../domain/ports/movie-external.port.js";
import { TmdbMoviePayload } from "../../domain/movie.factory.js";

const TMDB_DETAIL_CACHE_TTL_SECONDS = 60 * 60 * 24; // 24시간

@Injectable()
export class TmdbMovieGateway extends MovieExternalPort {
  constructor(
    private readonly tmdbService: TmdbService,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  async fetchMovieDetail(
    tmdbId: number,
    language: string,
  ): Promise<TmdbMoviePayload> {
    const cacheKey = this.buildCacheKey(tmdbId, language);
    const cached = await this.cacheService.get<TmdbMoviePayload>(cacheKey);
    if (cached) {
      return cached;
    }

    const payload = (await this.tmdbService.getMovieDetail(
      tmdbId,
      language,
    )) as TmdbMoviePayload;
    await this.cacheService.set(
      cacheKey,
      payload,
      TMDB_DETAIL_CACHE_TTL_SECONDS,
    );
    return payload;
  }

  private buildCacheKey(tmdbId: number, language: string): string {
    return `tmdb:movie-detail:${language}:${tmdbId}`;
  }
}
