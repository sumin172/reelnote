import { TmdbMoviePayload } from '../movie.factory';

export abstract class MovieExternalPort {
  abstract fetchMovieDetail(tmdbId: number, language: string): Promise<TmdbMoviePayload>;
}

