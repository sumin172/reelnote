import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MoviePresenter } from "./dto/movie.presenter.js";
import { GetMovieUseCase } from "./use-cases/get-movie.usecase.js";
import {
  ImportMoviesUseCase,
  ImportMoviesFailure,
  ImportMoviesResult,
} from "./use-cases/import-movies.usecase.js";
import { MovieResponseDto } from "../dto/movie.dto.js";
import {
  ImportMoviesJobService,
  ImportMoviesJobDetail,
  ImportMoviesJobStatus,
  ImportMoviesJobSummary,
} from "./jobs/import-movies.job-service.js";
import { ExceptionFactoryService } from "../../common/error/exception-factory.service.js";

@Injectable()
export class MoviesFacade {
  private readonly defaultStaleThresholdDays = 7;
  private readonly defaultCacheTtlSeconds = 3600;
  private readonly defaultImportConcurrency = 5;
  private readonly defaultImportQueueThreshold = 50;
  private readonly defaultImportChunkSize = 100;

  constructor(
    private readonly configService: ConfigService,
    private readonly getMovieUseCase: GetMovieUseCase,
    private readonly importMoviesUseCase: ImportMoviesUseCase,
    private readonly importMoviesJobService: ImportMoviesJobService,
    private readonly exceptionFactory: ExceptionFactoryService,
  ) {}

  async getMovie(
    tmdbId: number,
    language = "ko-KR",
  ): Promise<MovieResponseDto> {
    const { staleThresholdDays, cacheTtlSeconds } = this.resolveConfig();

    const snapshot = await this.getMovieUseCase.execute({
      tmdbId,
      language,
      staleThresholdDays,
      cacheTtlSeconds,
    });

    return MoviePresenter.toResponse(snapshot);
  }

  async importMovies(params: {
    tmdbIds: number[];
    language: string;
    resumeJobId?: string;
  }): Promise<
    | {
        kind: "immediate";
        result: { movies: MovieResponseDto[]; failures: ImportMoviesFailure[] };
      }
    | { kind: "queued"; job: ImportMoviesJobSummary }
  > {
    const { tmdbIds, language, resumeJobId } = params;
    const { cacheTtlSeconds } = this.resolveConfig();
    const { concurrencyLimit, queueThreshold, chunkSize } =
      this.resolveImportConfig();

    const effectiveIds = this.resolveTmdbIds(tmdbIds, resumeJobId);
    if (effectiveIds.length === 0) {
      return {
        kind: "immediate",
        result: {
          movies: [],
          failures: [],
        },
      };
    }

    if (effectiveIds.length >= queueThreshold) {
      const job = this.importMoviesJobService.enqueue(
        {
          tmdbIds: effectiveIds,
          language,
          cacheTtlSeconds,
        },
        {
          concurrencyLimit,
          chunkSize,
        },
      );

      return { kind: "queued", job };
    }

    const result = await this.importMoviesUseCase.execute(
      {
        tmdbIds: effectiveIds,
        language,
        cacheTtlSeconds,
      },
      {
        concurrencyLimit,
        chunkSize,
      },
    );

    return {
      kind: "immediate",
      result: this.mapImportResult(result),
    };
  }

  getImportJob(jobId: string): {
    detail: ImportMoviesJobDetail;
    movies?: MovieResponseDto[];
    failures: ImportMoviesFailure[];
  } {
    const detail = this.importMoviesJobService.getJob(jobId);
    const mapped = detail.result
      ? this.mapImportResult(detail.result)
      : undefined;

    return {
      detail,
      movies: mapped?.movies,
      failures: mapped?.failures ?? detail.failures,
    };
  }

  private resolveConfig(): {
    staleThresholdDays: number;
    cacheTtlSeconds: number;
  } {
    const staleThresholdDays = this.configService.get<number>(
      "MOVIE_STALE_THRESHOLD_DAYS",
      this.defaultStaleThresholdDays,
    );
    const cacheTtlSeconds = this.configService.get<number>(
      "MOVIE_CACHE_TTL_SECONDS",
      this.defaultCacheTtlSeconds,
    );

    return {
      staleThresholdDays,
      cacheTtlSeconds,
    };
  }

  private resolveImportConfig(): {
    concurrencyLimit: number;
    queueThreshold: number;
    chunkSize: number;
  } {
    const concurrency = Number(
      this.configService.get<string>("MOVIE_IMPORT_CONCURRENCY") ??
        this.defaultImportConcurrency,
    );
    const threshold = Number(
      this.configService.get<string>("MOVIE_IMPORT_QUEUE_THRESHOLD") ??
        this.defaultImportQueueThreshold,
    );
    const chunk = Number(
      this.configService.get<string>("MOVIE_IMPORT_CHUNK_SIZE") ??
        this.defaultImportChunkSize,
    );

    const concurrencyLimit =
      Number.isFinite(concurrency) && concurrency > 0
        ? Math.floor(concurrency)
        : this.defaultImportConcurrency;
    const queueThreshold =
      Number.isFinite(threshold) && threshold > 0
        ? Math.floor(threshold)
        : this.defaultImportQueueThreshold;
    const chunkSize =
      Number.isFinite(chunk) && chunk > 0
        ? Math.floor(chunk)
        : this.defaultImportChunkSize;

    return {
      concurrencyLimit,
      queueThreshold,
      chunkSize,
    };
  }

  private resolveTmdbIds(tmdbIds: number[], resumeJobId?: string): number[] {
    const uniqueIds = new Set(tmdbIds);

    if (resumeJobId) {
      const job = this.importMoviesJobService.getJob(resumeJobId);
      if (
        job.status === ImportMoviesJobStatus.Pending ||
        job.status === ImportMoviesJobStatus.Running
      ) {
        throw this.exceptionFactory.jobInProgress(resumeJobId);
      }

      for (const failure of job.failures) {
        uniqueIds.add(failure.tmdbId);
      }
    }

    return Array.from(uniqueIds);
  }

  private mapImportResult(result: ImportMoviesResult): {
    movies: MovieResponseDto[];
    failures: ImportMoviesFailure[];
  } {
    return {
      movies: result.snapshots.map((snapshot) =>
        MoviePresenter.toResponse(snapshot),
      ),
      failures: result.failures,
    };
  }
}
