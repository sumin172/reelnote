import { Movie } from "../movie.js";

export type SaveStrategy = "single" | "batch";

export interface SaveOptions {
  strategy?: SaveStrategy;
}

export interface SaveManyOptions extends SaveOptions {
  chunkSize?: number;
}

export abstract class MovieRepositoryPort {
  abstract findByTmdbId(tmdbId: number): Promise<Movie | null>;
  abstract save(movie: Movie, options?: SaveOptions): Promise<Movie>;
  abstract saveMany(
    movies: Movie[],
    options?: SaveManyOptions,
  ): Promise<Movie[]>;
}
