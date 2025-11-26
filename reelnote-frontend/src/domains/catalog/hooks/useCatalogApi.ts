"use client";

import { useActionId } from "@/lib/action/action-context";
import type { SearchResponse } from "../types";
import { searchMovies as searchMoviesService } from "../services";

type SearchMoviesOptions = {
  language?: string;
  signal?: AbortSignal;
};

/**
 * useCatalogApi
 *
 * Catalog 도메인 API 호출을 위한 훅입니다.
 * actionId를 자동으로 주입합니다.
 *
 * 사용 예시:
 * ```tsx
 * const { searchMovies } = useCatalogApi();
 *
 * const { data } = useQuery({
 *   queryKey: catalogQueryKeys.search({ q: query, page: 1 }),
 *   queryFn: ({ signal }) => searchMovies(query, 1, { signal }),
 * });
 * ```
 *
 * @throws {Error} ActionProvider 밖에서 호출된 경우
 */
export function useCatalogApi() {
  const actionId = useActionId();

  return {
    /**
     * 영화 검색
     */
    searchMovies: async (
      q: string,
      page = 1,
      options: SearchMoviesOptions = {},
    ): Promise<SearchResponse> => {
      return searchMoviesService(q, page, {
        ...options,
        actionId, // 자동 주입
      });
    },
  };
}
