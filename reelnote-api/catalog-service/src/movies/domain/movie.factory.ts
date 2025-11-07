import { Movie, MovieSnapshot } from './movie';

export interface TmdbMoviePayload {
  id?: number;
  title: string;
  original_title: string;
  release_date?: string;
  runtime?: number;
  original_language?: string;
  production_countries?: Array<{ name?: string }>;
  poster_path?: string;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id?: number; name: string }>;
  keywords?: { keywords?: Array<{ id?: number; name: string }> };
  [key: string]: unknown;
}

export class MovieFactory {
  static fromTmdb(tmdbId: number, payload: TmdbMoviePayload, syncedAt: Date): Movie {
    const snapshot: MovieSnapshot = {
      tmdbId,
      title: payload.title ?? '',
      originalTitle: payload.original_title ?? '',
      year: payload.release_date ? new Date(payload.release_date).getFullYear() : undefined,
      runtime: payload.runtime ?? undefined,
      language: payload.original_language ?? undefined,
      country: payload.production_countries?.[0]?.name ?? undefined,
      posterPath: payload.poster_path ?? undefined,
      popularity: payload.popularity ?? undefined,
      voteAvg: payload.vote_average ?? undefined,
      voteCnt: payload.vote_count ?? undefined,
      syncedAt,
      genres: payload.genres?.map(genre => genre.name).filter(Boolean) ?? [],
      keywords: payload.keywords?.keywords?.map(keyword => keyword.name).filter(Boolean) ?? [],
      rawPayload: payload,
    };

    return Movie.create(snapshot);
  }
}

