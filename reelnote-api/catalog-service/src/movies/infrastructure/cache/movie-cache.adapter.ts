import { Injectable } from "@nestjs/common";
import { CacheService } from "../../../cache/cache.service.js";
import { MovieCachePort } from "../../application/ports/movie-cache.port.js";
import { MovieSnapshot } from "../../domain/movie.js";

@Injectable()
export class MovieCacheAdapter extends MovieCachePort {
  constructor(private readonly cacheService: CacheService) {
    super();
  }

  async get(tmdbId: number, language: string): Promise<MovieSnapshot | null> {
    const key = this.buildKey(tmdbId, language);
    const value = await this.cacheService.get<MovieSnapshot>(key);
    if (!value) {
      return null;
    }

    return {
      ...value,
      syncedAt: new Date(value.syncedAt),
      sourceUpdatedAt: value.sourceUpdatedAt
        ? new Date(value.sourceUpdatedAt)
        : (value.sourceUpdatedAt ?? undefined),
      genres: [...(value.genres ?? [])],
      keywords: [...(value.keywords ?? [])],
    };
  }

  async set(
    tmdbId: number,
    language: string,
    snapshot: MovieSnapshot,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.buildKey(tmdbId, language);
    const { rawPayload: _rawPayload, ...cached } = snapshot;
    void _rawPayload;
    const payload = {
      ...cached,
      syncedAt: cached.syncedAt.toISOString(),
      sourceUpdatedAt: cached.sourceUpdatedAt
        ? cached.sourceUpdatedAt.toISOString()
        : (cached.sourceUpdatedAt ?? undefined),
    };
    await this.cacheService.set(key, payload, ttlSeconds);
  }

  private buildKey(tmdbId: number, language: string): string {
    return `movie:${tmdbId}:${language}`;
  }
}
