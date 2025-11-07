import { apiFetch } from "@/lib/api/client";
import type { SearchResponse } from "./types";

export const catalogQueryKeys = {
  search: (q: string, page = 1) => ["catalog", "search", { q, page }] as const,
};

export async function searchMovies(q: string, page = 1) {
  const params = new URLSearchParams({ query: q, page: String(page) });
  return apiFetch<SearchResponse>(`/api/v1/movies/search?${params.toString()}`);
}
