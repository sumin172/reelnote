import { Movie } from '../movie';

export abstract class MovieRepositoryPort {
  abstract findByTmdbId(tmdbId: number): Promise<Movie | null>;
  abstract save(movie: Movie): Promise<Movie>;
}

