"use client";

import { useActionId } from "@/lib/action/action-context";
import type { Review } from "../types";
import {
  fetchReviews as fetchReviewsService,
  createReview as createReviewService,
} from "../services";

/**
 * useReviewApi
 *
 * Review 도메인 API 호출을 위한 훅입니다.
 * actionId를 자동으로 주입합니다.
 *
 * 사용 예시:
 * ```tsx
 * const { fetchReviews, createReview } = useReviewApi();
 *
 * const { data } = useQuery({
 *   queryKey: reviewQueryKeys.list(),
 *   queryFn: () => fetchReviews({ page: 0, size: 10 }),
 * });
 * ```
 *
 * @throws {Error} ActionProvider 밖에서 호출된 경우
 */
export function useReviewApi() {
  const actionId = useActionId();

  return {
    /**
     * 리뷰 목록 조회
     */
    fetchReviews: async (params: { page?: number; size?: number } = {}) => {
      return fetchReviewsService({
        ...params,
        actionId, // 자동 주입
      });
    },

    /**
     * 리뷰 생성
     */
    createReview: async (
      payload: Pick<
        Review,
        "movieId" | "rating" | "reason" | "tags" | "watchedAt"
      >,
    ) => {
      return createReviewService(payload, {
        actionId, // 자동 주입
      });
    },
  };
}
