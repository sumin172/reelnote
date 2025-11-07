import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MovieFactory } from '../../domain/movie.factory';
import { MovieRepositoryPort } from '../../domain/ports/movie-repository.port';
import { MovieExternalPort } from '../../domain/ports/movie-external.port';
import { MovieSnapshot } from '../../domain/movie';
import { MovieCachePort } from '../ports/movie-cache.port';

export interface SyncMovieCommand {
  tmdbId: number;
  language: string;
  cacheTtlSeconds: number;
}

@Injectable()
export class SyncMovieUseCase {
  private readonly logger = new Logger(SyncMovieUseCase.name);

  constructor(
    private readonly movieExternalPort: MovieExternalPort,
    private readonly movieRepository: MovieRepositoryPort,
    private readonly movieCache: MovieCachePort,
  ) {}

  async execute(command: SyncMovieCommand): Promise<MovieSnapshot> {
    const { tmdbId, language, cacheTtlSeconds } = command;

    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      this.logger.warn(`Invalid TMDB ID requested for sync: ${tmdbId}`);
      throw new BadRequestException('유효하지 않은 TMDB ID 입니다. 양의 정수를 입력해주세요.');
    }

    const payload = await this.movieExternalPort.fetchMovieDetail(tmdbId, language);
    const domainMovie = MovieFactory.fromTmdb(tmdbId, payload, new Date());
    const persisted = await this.movieRepository.save(domainMovie);
    const snapshot = persisted.toSnapshot();

    await this.movieCache.set(tmdbId, language, snapshot, cacheTtlSeconds);
    this.logger.log(`Movie ${tmdbId} synced from TMDB.`);

    return snapshot;
  }
}


