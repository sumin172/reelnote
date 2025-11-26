import { apiFetch } from "@/lib/api/client";
import { catalogConfig } from "@/lib/config/catalog.config";
import type { CatalogMovie, SearchResponse } from "./types";

/**
 * Catalog 도메인 QueryKey 팩토리
 *
 * 계층 구조:
 * - all: 도메인 루트
 * - lists(): 모든 리스트 계열 쿼리 (list, search 등)
 * - search(): 검색 쿼리 (lists 계열)
 */
export const catalogQueryKeys = {
  all: ["catalog"] as const,
  lists: () => [...catalogQueryKeys.all, "list"] as const,
  search: (params: Readonly<{ q: string; page: number }>) =>
    [...catalogQueryKeys.lists(), "search", params] as const,
} as const;

/**
 * Catalog 도메인 QueryKey 타입 (향후 활용 예정)
 *
 * 향후 타입 안전성 강화를 위해 사용할 수 있습니다:
 * - invalidateQueries({ queryKey: ... })에서 타입 체크
 * - 커스텀 훅에서 queryKey 파라미터 타입 제한
 *
 * @example
 * export type CatalogQueryKey =
 *   | typeof catalogQueryKeys.all
 *   | ReturnType<typeof catalogQueryKeys.lists>
 *   | ReturnType<typeof catalogQueryKeys.search>;
 */

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

type SearchMoviesOptions = {
  language?: string;
  signal?: AbortSignal;
};

export async function searchMovies(
  q: string,
  page = 1,
  options: SearchMoviesOptions = {},
): Promise<SearchResponse> {
  const { language = "ko-KR", signal } = options;

  const params = new URLSearchParams({
    q,
    page: String(page),
    language,
  });

  const raw = await apiFetch<CatalogSearchApiResponse>(
    `/v1/search?${params.toString()}`,
    {
      baseUrl: catalogConfig.baseUrl,
      signal,
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
