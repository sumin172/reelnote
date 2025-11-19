import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  ImportMoviesCommand,
  ImportMoviesFailure,
  ImportMoviesOptions,
  ImportMoviesProgress,
  ImportMoviesResult,
  ImportMoviesUseCase,
} from "../use-cases/import-movies.usecase.js";
import { ExceptionFactoryService } from "../../../common/error/exception-factory.service.js";

export enum ImportMoviesJobStatus {
  Pending = "pending",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
}

export interface ImportMoviesJobSummary {
  jobId: string;
  status: ImportMoviesJobStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  requestedAt: Date;
  completedAt?: Date;
}

export interface ImportMoviesJobDetail extends ImportMoviesJobSummary {
  failures: ImportMoviesFailure[];
  result?: ImportMoviesResult;
  error?: string;
}

interface ImportMoviesJobInternal {
  id: string;
  status: ImportMoviesJobStatus;
  command: ImportMoviesCommand;
  requestedAt: Date;
  completedAt?: Date;
  progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  result?: ImportMoviesResult;
  failures: ImportMoviesFailure[];
  error?: string;
  options: ImportMoviesOptions;
}

@Injectable()
export class ImportMoviesJobService {
  private readonly logger = new Logger(ImportMoviesJobService.name);
  private readonly jobs = new Map<string, ImportMoviesJobInternal>();

  constructor(
    private readonly importMoviesUseCase: ImportMoviesUseCase,
    private readonly exceptionFactory: ExceptionFactoryService,
  ) {}

  enqueue(
    command: ImportMoviesCommand,
    options: ImportMoviesOptions,
  ): ImportMoviesJobSummary {
    const jobId = randomUUID();
    const uniqueTmdbIds = Array.from(new Set(command.tmdbIds));
    const effectiveCommand: ImportMoviesCommand = {
      ...command,
      tmdbIds: uniqueTmdbIds,
    };
    const job: ImportMoviesJobInternal = {
      id: jobId,
      status: ImportMoviesJobStatus.Pending,
      command: effectiveCommand,
      requestedAt: new Date(),
      progress: {
        total: uniqueTmdbIds.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
      },
      failures: [],
      options,
    };

    this.jobs.set(jobId, job);
    this.logger.log(
      `Enqueued import job ${jobId} (total=${job.progress.total})`,
    );

    setImmediate(() => this.process(job));

    return this.mapToSummary(job);
  }

  getJob(jobId: string): ImportMoviesJobDetail {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw this.exceptionFactory.jobNotFound(jobId);
    }

    return this.mapToDetail(job);
  }

  private async process(job: ImportMoviesJobInternal): Promise<void> {
    if (job.status !== ImportMoviesJobStatus.Pending) {
      return;
    }

    job.status = ImportMoviesJobStatus.Running;
    this.logger.log(`Processing import job ${job.id}`);

    const onProgress = (progress: ImportMoviesProgress) => {
      job.progress.processed = progress.processed;
      job.progress.succeeded = progress.succeeded;
      job.progress.failed = progress.failed;
    };

    try {
      const result = await this.importMoviesUseCase.execute(job.command, {
        ...job.options,
        onProgress,
      });

      job.result = result;
      job.failures = result.failures;
      job.progress.processed = job.progress.total;
      job.progress.succeeded = result.snapshots.length;
      job.progress.failed = result.failures.length;
      job.status = ImportMoviesJobStatus.Completed;
      this.logger.log(
        `Import job ${job.id} completed (success=${job.progress.succeeded}, failed=${job.progress.failed})`,
      );
    } catch (error) {
      job.status = ImportMoviesJobStatus.Failed;
      const err = error instanceof Error ? error : new Error(String(error));
      job.error = err.message ?? "UNKNOWN_ERROR";
      this.logger.error(`Import job ${job.id} failed: ${job.error}`, err.stack);
    } finally {
      job.completedAt = new Date();
    }
  }

  private mapToSummary(job: ImportMoviesJobInternal): ImportMoviesJobSummary {
    return {
      jobId: job.id,
      status: job.status,
      total: job.progress.total,
      processed: job.progress.processed,
      succeeded: job.progress.succeeded,
      failed: job.progress.failed,
      requestedAt: job.requestedAt,
      completedAt: job.completedAt,
    };
  }

  private mapToDetail(job: ImportMoviesJobInternal): ImportMoviesJobDetail {
    return {
      ...this.mapToSummary(job),
      failures: job.failures,
      result: job.result,
      error: job.error,
    };
  }
}
