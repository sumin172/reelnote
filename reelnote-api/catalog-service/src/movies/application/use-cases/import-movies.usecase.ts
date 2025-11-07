import { Injectable, Logger } from '@nestjs/common';
import { SyncMovieUseCase } from './sync-movie.usecase';
import { MovieSnapshot } from '../../domain/movie';

export interface ImportMoviesCommand {
  tmdbIds: number[];
  language: string;
  cacheTtlSeconds: number;
}

@Injectable()
export class ImportMoviesUseCase {
  private readonly logger = new Logger(ImportMoviesUseCase.name);

  constructor(private readonly syncMovieUseCase: SyncMovieUseCase) {}

  async execute(command: ImportMoviesCommand): Promise<MovieSnapshot[]> {
    const { tmdbIds, language, cacheTtlSeconds } = command;
    const results: MovieSnapshot[] = [];

    for (const tmdbId of tmdbIds) {
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        this.logger.warn(`Skipping invalid TMDB ID during import: ${tmdbId}`);
        continue;
      }

      try {
        const snapshot = await this.syncMovieUseCase.execute({ tmdbId, language, cacheTtlSeconds });
        results.push(snapshot);
      } catch (error) {
        this.logger.error(`Failed to import movie ${tmdbId}`, error);
      }
    }

    this.logger.log(`Imported ${results.length}/${tmdbIds.length} movies.`);
    return results;
  }
}


