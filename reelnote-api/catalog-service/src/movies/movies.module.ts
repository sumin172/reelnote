import { Module } from "@nestjs/common";
import { MoviesController } from "./movies.controller.js";
import { CatalogPrismaModule } from "../infrastructure/db/catalog-prisma.module.js";
import { TmdbModule } from "../tmdb/tmdb.module.js";
import { CacheModule } from "../cache/cache.module.js";
import { MoviesFacade } from "./application/movies.facade.js";
import { GetMovieUseCase } from "./application/use-cases/get-movie.usecase.js";
import { SyncMovieUseCase } from "./application/use-cases/sync-movie.usecase.js";
import { ImportMoviesUseCase } from "./application/use-cases/import-movies.usecase.js";
import { MovieRepositoryPort } from "./domain/ports/movie-repository.port.js";
import { MovieCachePort } from "./application/ports/movie-cache.port.js";
import { MovieExternalPort } from "./domain/ports/movie-external.port.js";
import { PrismaMovieRepository } from "./infrastructure/persistence/prisma-movie.repository.js";
import { MovieCacheAdapter } from "./infrastructure/cache/movie-cache.adapter.js";
import { TmdbMovieGateway } from "./infrastructure/external/tmdb-movie.gateway.js";
import { ImportMoviesJobService } from "./application/jobs/import-movies.job-service.js";

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
