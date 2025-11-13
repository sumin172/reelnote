import { TmdbMoviePayload } from "../movie.factory.js";

export abstract class MovieExternalPort {
  abstract fetchMovieDetail(
    tmdbId: number,
    language: string,
  ): Promise<TmdbMoviePayload>;
}
