import { apiFetch } from "@/lib/api/client";
import { config } from "@/lib/env";
import type { CatalogMovie, SearchResponse } from "./types";

export const catalogQueryKeys = {
  search: (q: string, page = 1) => ["catalog", "search", { q, page }] as const,
};

type CatalogSearchApiMovie = {
  tmdbId?: number;
  title?: string | null;
  originalTitle?: string | null;
  posterPath?: string | null;
  year?: number | null;
};

type CatalogSearchApiResponse = {
  page: number;
  query: string;
  local: CatalogSearchApiMovie[];
  tmdb: CatalogSearchApiMovie[];
};

function mapMovie(
  movie: CatalogSearchApiMovie,
  source: CatalogMovie["source"],
): CatalogMovie | null {
  if (movie.tmdbId == null) return null;

  return {
    tmdbId: movie.tmdbId,
    title: movie.title ?? "제목 미상",
    originalTitle: movie.originalTitle,
    posterPath: movie.posterPath ?? null,
    year: movie.year ?? null,
    source,
  };
}

export async function searchMovies(
  q: string,
  page = 1,
  language = "ko-KR",
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q,
    page: String(page),
    language,
  });

  const raw = await apiFetch<CatalogSearchApiResponse>(
    `/v1/search?${params.toString()}`,
    {
      baseUrl: config.catalogApiBaseUrl,
    },
  );

  return {
    page: raw.page,
    query: raw.query,
    local: raw.local
      .map((movie) => mapMovie(movie, "local"))
      .filter((movie): movie is CatalogMovie => movie !== null),
    tmdb: raw.tmdb
      .map((movie) => mapMovie(movie, "tmdb"))
      .filter((movie): movie is CatalogMovie => movie !== null),
  };
}
