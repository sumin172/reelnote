import { Injectable, Logger } from "@nestjs/common";
import { MovieFactory } from "../../domain/movie.factory.js";
import {
  MovieRepositoryPort,
  SaveStrategy,
} from "../../domain/ports/movie-repository.port.js";
import { MovieExternalPort } from "../../domain/ports/movie-external.port.js";
import { Movie, MovieSnapshot } from "../../domain/movie.js";
import { MovieCachePort } from "../ports/movie-cache.port.js";
import { ExceptionFactoryService } from "../../../common/error/exception-factory.service.js";

export interface SyncMovieCommand {
  tmdbId: number;
  language: string;
  cacheTtlSeconds: number;
  strategy?: SaveStrategy;
}

export interface SyncMovieFailure {
  tmdbId: number;
  reason: string;
}

export interface SyncManyProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  lastTmdbId?: number;
}

export interface SyncManyOptions {
  strategy?: SaveStrategy;
  concurrencyLimit?: number;
  chunkSize?: number;
  onProgress?: (progress: SyncManyProgress) => void;
}

interface MovieBuildResult {
  command: SyncMovieCommand;
  movie: Movie;
}

@Injectable()
export class SyncMovieUseCase {
  private readonly logger = new Logger(SyncMovieUseCase.name);

  constructor(
    private readonly movieExternalPort: MovieExternalPort,
    private readonly movieRepository: MovieRepositoryPort,
    private readonly movieCache: MovieCachePort,
    private readonly exceptionFactory: ExceptionFactoryService,
  ) {}

  async execute(command: SyncMovieCommand): Promise<MovieSnapshot> {
    const { tmdbId, language, cacheTtlSeconds, strategy = "single" } = command;

    const movie = await this.buildMovie(command);
    const persisted = await this.movieRepository.save(movie, { strategy });
    const snapshot = persisted.toSnapshot();

    await this.movieCache.set(tmdbId, language, snapshot, cacheTtlSeconds);
    this.logger.log(`Movie ${tmdbId} synced from TMDB.`);

    return snapshot;
  }

  async syncMany(
    commands: SyncMovieCommand[],
    options: SyncManyOptions = {},
  ): Promise<{ snapshots: MovieSnapshot[]; failures: SyncMovieFailure[] }> {
    if (commands.length === 0) {
      return { snapshots: [], failures: [] };
    }

    const strategy = options.strategy ?? "batch";
    const concurrencyLimit = Math.max(1, options.concurrencyLimit ?? 5);
    const chunkSize = Math.max(1, options.chunkSize ?? 100);

    const total = commands.length;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    const snapshots: MovieSnapshot[] = [];
    const failures: SyncMovieFailure[] = [];

    const notifyProgress = (tmdbId?: number) => {
      options.onProgress?.({
        total,
        processed,
        succeeded,
        failed,
        lastTmdbId: tmdbId,
      });
    };

    const queue = [...commands];

    while (queue.length > 0) {
      const chunkCommands = queue.splice(0, chunkSize);
      const { movies: builtMovies, failures: buildFailures } =
        await this.buildMovies(chunkCommands, concurrencyLimit);

      for (const failure of buildFailures) {
        failures.push(failure);
        failed += 1;
        processed += 1;
        notifyProgress(failure.tmdbId);
      }

      if (builtMovies.length === 0) {
        continue;
      }

      try {
        const persisted = await this.movieRepository.saveMany(
          builtMovies.map((item) => item.movie),
          { strategy, chunkSize: builtMovies.length },
        );

        const commandMap = new Map<number, SyncMovieCommand>();
        for (const item of builtMovies) {
          commandMap.set(item.command.tmdbId, item.command);
        }

        for (const movie of persisted) {
          const command = commandMap.get(movie.tmdbId);
          if (!command) {
            continue;
          }

          const snapshot = movie.toSnapshot();
          await this.movieCache.set(
            command.tmdbId,
            command.language,
            snapshot,
            command.cacheTtlSeconds,
          );
          snapshots.push(snapshot);
          succeeded += 1;
          processed += 1;
          notifyProgress(command.tmdbId);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "UNKNOWN_ERROR";
        this.logger.error(`Failed to persist movie chunk`, error as Error);
        for (const item of builtMovies) {
          failures.push({ tmdbId: item.command.tmdbId, reason });
          failed += 1;
          processed += 1;
          notifyProgress(item.command.tmdbId);
        }
      }
    }

    return { snapshots, failures };
  }

  private async buildMovie(command: SyncMovieCommand): Promise<Movie> {
    const { tmdbId, language } = command;

    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      this.logger.warn(`Invalid TMDB ID requested for sync: ${tmdbId}`);
      throw this.exceptionFactory.validationError(
        "유효하지 않은 TMDB ID 입니다. 양의 정수를 입력해주세요.",
      );
    }

    const payload = await this.movieExternalPort.fetchMovieDetail(
      tmdbId,
      language,
    );
    return MovieFactory.fromTmdb(tmdbId, payload, new Date());
  }

  private async buildMovies(
    commands: SyncMovieCommand[],
    concurrencyLimit: number,
  ): Promise<{ movies: MovieBuildResult[]; failures: SyncMovieFailure[] }> {
    const movies: MovieBuildResult[] = [];
    const failures: SyncMovieFailure[] = [];

    let index = 0;

    const worker = async () => {
      while (index < commands.length) {
        const targetIndex = index;
        index += 1;

        const command = commands[targetIndex];

        try {
          const movie = await this.buildMovie(command);
          movies.push({ command, movie });
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : "UNKNOWN_ERROR";
          failures.push({ tmdbId: command.tmdbId, reason });
        }
      }
    };

    const workerCount = Math.min(concurrencyLimit, commands.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);

    return { movies, failures };
  }
}
