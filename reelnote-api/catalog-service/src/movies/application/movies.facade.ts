import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MoviePresenter } from './dto/movie.presenter';
import { GetMovieUseCase } from './use-cases/get-movie.usecase';
import { ImportMoviesUseCase } from './use-cases/import-movies.usecase';
import { MovieResponseDto } from '../dto/movie.dto';

@Injectable()
export class MoviesFacade {
  private readonly defaultStaleThresholdDays = 7;
  private readonly defaultCacheTtlSeconds = 3600;

  constructor(
    private readonly configService: ConfigService,
    private readonly getMovieUseCase: GetMovieUseCase,
    private readonly importMoviesUseCase: ImportMoviesUseCase,
  ) {}

  async getMovie(tmdbId: number, language: string = 'ko-KR'): Promise<MovieResponseDto> {
    const { staleThresholdDays, cacheTtlSeconds } = this.resolveConfig();

    const snapshot = await this.getMovieUseCase.execute({
      tmdbId,
      language,
      staleThresholdDays,
      cacheTtlSeconds,
    });

    return MoviePresenter.toResponse(snapshot);
  }

  async importMovies(tmdbIds: number[], language: string = 'ko-KR'): Promise<MovieResponseDto[]> {
    const { cacheTtlSeconds } = this.resolveConfig();

    const snapshots = await this.importMoviesUseCase.execute({
      tmdbIds,
      language,
      cacheTtlSeconds,
    });

    return snapshots.map(snapshot => MoviePresenter.toResponse(snapshot));
  }

  private resolveConfig(): { staleThresholdDays: number; cacheTtlSeconds: number } {
    const staleThresholdDays = this.configService.get<number>('MOVIE_STALE_THRESHOLD_DAYS', this.defaultStaleThresholdDays);
    const cacheTtlSeconds = this.configService.get<number>('MOVIE_CACHE_TTL_SECONDS', this.defaultCacheTtlSeconds);

    return {
      staleThresholdDays,
      cacheTtlSeconds,
    };
  }
}

