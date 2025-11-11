import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { CatalogPrismaModule } from '../infrastructure/db/catalog-prisma.module';
import { TmdbModule } from '../tmdb/tmdb.module';
import { CacheModule } from '../cache/cache.module';
import { MoviesFacade } from './application/movies.facade';
import { GetMovieUseCase } from './application/use-cases/get-movie.usecase';
import { SyncMovieUseCase } from './application/use-cases/sync-movie.usecase';
import { ImportMoviesUseCase } from './application/use-cases/import-movies.usecase';
import { MovieRepositoryPort } from './domain/ports/movie-repository.port';
import { MovieCachePort } from './application/ports/movie-cache.port';
import { MovieExternalPort } from './domain/ports/movie-external.port';
import { PrismaMovieRepository } from './infrastructure/persistence/prisma-movie.repository';
import { MovieCacheAdapter } from './infrastructure/cache/movie-cache.adapter';
import { TmdbMovieGateway } from './infrastructure/external/tmdb-movie.gateway';
import { ImportMoviesJobService } from './application/jobs/import-movies.job-service';

@Module({
  imports: [CatalogPrismaModule, TmdbModule, CacheModule],
  controllers: [MoviesController],
  providers: [
    MoviesFacade,
    GetMovieUseCase,
    SyncMovieUseCase,
    ImportMoviesUseCase,
    ImportMoviesJobService,
    {
      provide: MovieRepositoryPort,
      useClass: PrismaMovieRepository,
    },
    {
      provide: MovieCachePort,
      useClass: MovieCacheAdapter,
    },
    {
      provide: MovieExternalPort,
      useClass: TmdbMovieGateway,
    },
  ],
  exports: [MoviesFacade],
})
export class MoviesModule {}


