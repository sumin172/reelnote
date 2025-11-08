import { apiFetch } from "@/lib/api/client";
import type { Page, Review } from "./types";

export const reviewQueryKeys = {
  all: ["reviews"] as const,
  list: (params?: { page?: number; size?: number }) =>
    [...reviewQueryKeys.all, "list", params] as const,
};

export async function fetchReviews(
  params: { page?: number; size?: number } = {},
) {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.size != null) search.set("size", String(params.size));
  const qs = search.toString();
  // Real API: personal reviews under /api/v1/reviews/my (base URL already includes /api)
  const path = `/v1/reviews/my${qs ? `?${qs}` : ""}`;
  return apiFetch<Page<Review>>(path);
}

export async function createReview(
  payload: Pick<Review, "movieId" | "rating" | "reason" | "tags" | "watchedAt">,
) {
  return apiFetch<Review>(`/v1/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
