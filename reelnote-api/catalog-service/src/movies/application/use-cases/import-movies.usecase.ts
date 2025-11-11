import { Injectable, Logger } from '@nestjs/common';
import { SyncManyProgress, SyncMovieFailure, SyncMovieUseCase } from './sync-movie.usecase';
import { MovieSnapshot } from '../../domain/movie';

export interface ImportMoviesCommand {
  tmdbIds: number[];
  language: string;
  cacheTtlSeconds: number;
}

export interface ImportMoviesFailure {
  tmdbId: number;
  reason: string;
}

export interface ImportMoviesResult {
  snapshots: MovieSnapshot[];
  failures: ImportMoviesFailure[];
}

export interface ImportMoviesProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  lastTmdbId?: number;
}

export interface ImportMoviesOptions {
  concurrencyLimit?: number;
  chunkSize?: number;
  onProgress?: (progress: ImportMoviesProgress) => void;
}

@Injectable()
export class ImportMoviesUseCase {
  private readonly logger = new Logger(ImportMoviesUseCase.name);

  constructor(private readonly syncMovieUseCase: SyncMovieUseCase) {}

  async execute(command: ImportMoviesCommand, options: ImportMoviesOptions = {}): Promise<ImportMoviesResult> {
    const { tmdbIds, language, cacheTtlSeconds } = command;
    const { concurrencyLimit = 5, chunkSize, onProgress } = options;

    const uniqueTmdbIds = Array.from(new Set(tmdbIds));
    const commands = uniqueTmdbIds.map(tmdbId => ({
      tmdbId,
      language,
      cacheTtlSeconds,
      strategy: 'batch' as const,
    }));

    const { snapshots, failures } = await this.syncMovieUseCase.syncMany(commands, {
      strategy: 'batch',
      concurrencyLimit: Number.isFinite(concurrencyLimit) && concurrencyLimit > 0 ? Math.floor(concurrencyLimit) : 1,
      chunkSize,
      onProgress: (progress: SyncManyProgress) => {
        onProgress?.({
          total: progress.total,
          processed: progress.processed,
          succeeded: progress.succeeded,
          failed: progress.failed,
          lastTmdbId: progress.lastTmdbId,
        });
      },
    });

    const mappedFailures: ImportMoviesFailure[] = failures.map(failure => this.mapFailure(failure));

    this.logger.log(`Imported ${snapshots.length}/${uniqueTmdbIds.length} movies (failed: ${mappedFailures.length}).`);
    return { snapshots, failures: mappedFailures };
  }

  private mapFailure(failure: SyncMovieFailure): ImportMoviesFailure {
    return {
      tmdbId: failure.tmdbId,
      reason: failure.reason,
    };
  }
}
