import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../cache/cache.service';
import { MovieCachePort } from '../../application/ports/movie-cache.port';
import { MovieSnapshot } from '../../domain/movie';

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
      genres: [...(value.genres ?? [])],
      keywords: [...(value.keywords ?? [])],
    };
  }

  async set(tmdbId: number, language: string, snapshot: MovieSnapshot, ttlSeconds: number): Promise<void> {
    const key = this.buildKey(tmdbId, language);
    const { rawPayload, ...cached } = snapshot;
    await this.cacheService.set(key, cached, ttlSeconds);
  }

  private buildKey(tmdbId: number, language: string): string {
    return `movie:${tmdbId}:${language}`;
  }
}

