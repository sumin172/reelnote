import { MovieSnapshot } from "../../domain/movie.js";

export abstract class MovieCachePort {
  abstract get(tmdbId: number, language: string): Promise<MovieSnapshot | null>;
  abstract set(
    tmdbId: number,
    language: string,
    snapshot: MovieSnapshot,
    ttlSeconds: number,
  ): Promise<void>;
}
