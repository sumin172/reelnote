import { createHash } from 'crypto';
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
    const sourceUpdatedAt = extractSourceUpdatedAt(payload);
    const sourceHash = computePayloadHash(payload);

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
      sourceUpdatedAt,
      sourceHash,
      genres: payload.genres?.map(genre => genre.name).filter(Boolean) ?? [],
      keywords: payload.keywords?.keywords?.map(keyword => keyword.name).filter(Boolean) ?? [],
      rawPayload: payload,
    };

    return Movie.create(snapshot);
  }
}

function extractSourceUpdatedAt(payload: TmdbMoviePayload): Date | undefined {
  const candidate =
    (payload as { last_updated?: string }).last_updated ??
    (payload as { last_updated_at?: string }).last_updated_at ??
    (payload as { updated_at?: string }).updated_at ??
    (payload as { last_modified_at?: string }).last_modified_at;

  if (!candidate) {
    return undefined;
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function computePayloadHash(payload: TmdbMoviePayload): string {
  const normalized = sortObject(payload);
  const json = JSON.stringify(normalized);
  return createHash('sha256').update(json).digest('hex');
}

function sortObject(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sortObject(item));
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortObject((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

