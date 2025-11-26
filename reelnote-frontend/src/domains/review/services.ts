import { apiFetch } from "@/lib/api/client";
import type { Page, Review } from "./types";

/**
 * Review 도메인 QueryKey 팩토리
 *
 * 계층 구조:
 * - all: 도메인 루트
 * - lists(): 모든 리스트 계열 쿼리
 * - list(): 리뷰 목록 쿼리 (lists 계열)
 */
export const reviewQueryKeys = {
  all: ["reviews"] as const,
  lists: () => [...reviewQueryKeys.all, "list"] as const,
  list: (params?: Readonly<{ page?: number; size?: number }>) =>
    [...reviewQueryKeys.lists(), params] as const,
} as const;

/**
 * Review 도메인 QueryKey 타입 (향후 활용 예정)
 *
 * 향후 타입 안전성 강화를 위해 사용할 수 있습니다:
 * - invalidateQueries({ queryKey: ... })에서 타입 체크
 * - 커스텀 훅에서 queryKey 파라미터 타입 제한
 *
 * @example
 * export type ReviewQueryKey =
 *   | typeof reviewQueryKeys.all
 *   | ReturnType<typeof reviewQueryKeys.lists>
 *   | ReturnType<typeof reviewQueryKeys.list>;
 */

export async function fetchReviews(
  params: { page?: number; size?: number; actionId?: string } = {},
) {
  const { page, size, actionId } = params;
  const search = new URLSearchParams();
  if (page != null) search.set("page", String(page));
  if (size != null) search.set("size", String(size));
  const qs = search.toString();
  // Real API: personal reviews under /api/v1/reviews/my (base URL already includes /api)
  const path = `/v1/reviews/my${qs ? `?${qs}` : ""}`;
  return apiFetch<Page<Review>>(path, {
    actionId,
  });
}

export async function createReview(
  payload: Pick<Review, "movieId" | "rating" | "reason" | "tags" | "watchedAt">,
  options: { actionId?: string } = {},
) {
  return apiFetch<Review>(`/v1/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
    actionId: options.actionId,
  });
}
