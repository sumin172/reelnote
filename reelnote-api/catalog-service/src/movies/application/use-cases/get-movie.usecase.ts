import { Injectable, Logger } from '@nestjs/common';
import { MovieRepositoryPort } from '../../domain/ports/movie-repository.port';
import { MovieSnapshot } from '../../domain/movie';
import { MovieCachePort } from '../ports/movie-cache.port';
import { SyncMovieUseCase } from './sync-movie.usecase';

export interface GetMovieQuery {
  tmdbId: number;
  language: string;
  staleThresholdDays: number;
  cacheTtlSeconds: number;
}

@Injectable()
export class GetMovieUseCase {
  private readonly logger = new Logger(GetMovieUseCase.name);

  constructor(
    private readonly movieRepository: MovieRepositoryPort,
    private readonly movieCache: MovieCachePort,
    private readonly syncMovieUseCase: SyncMovieUseCase,
  ) {}

  async execute(query: GetMovieQuery): Promise<MovieSnapshot> {
    const { tmdbId, language, staleThresholdDays, cacheTtlSeconds } = query;

    const cached = await this.movieCache.get(tmdbId, language);
    if (cached) {
      this.logger.debug(`Cache HIT - movie ${tmdbId}`);
      return cached;
    }

    const movie = await this.movieRepository.findByTmdbId(tmdbId);
    if (movie) {
      if (movie.isStale(staleThresholdDays)) {
        this.logger.log(`Movie ${tmdbId} is stale. Triggering background sync.`);
        this.syncMovieUseCase
          .execute({ tmdbId, language, cacheTtlSeconds })
          .catch(error => this.logger.error(`Failed to refresh movie ${tmdbId} in background`, error));
      }

      const snapshot = movie.toSnapshot();
      await this.movieCache.set(tmdbId, language, snapshot, cacheTtlSeconds);
      return snapshot;
    }

    return this.syncMovieUseCase.execute({ tmdbId, language, cacheTtlSeconds });
  }
}


