import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import type { ReviewCreateInput } from "@/domains/review/schema";
import { CommonErrorCode } from "@/lib/errors/error-codes";

/**
 * MSW 핸들러 생성 함수
 *
 * 현재 프로젝트 규모(3개 엔드포인트)에 적합한 단일 파일 구조
 * 향후 10개 이상의 엔드포인트가 생기면 도메인별 분리 고려
 */
export function createHandlers(): RequestHandler[] {
  return [
    // ===== 카탈로그 API =====
    http.get(/\/api\/v1\/search(\?.*)?$/, ({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get("q") ?? "";
      const page = Number(url.searchParams.get("page") ?? "1");

      return HttpResponse.json({
        query,
        page,
        local: Array.from({ length: 5 }).map((_, i) => ({
          tmdbId: (page - 1) * 10 + i + 1,
          title: query ? `${query} (로컬) ${i + 1}` : `로컬 영화 ${i + 1}`,
          originalTitle: null,
          posterPath: null,
          year: 2024,
        })),
        tmdb: Array.from({ length: 5 }).map((_, i) => ({
          tmdbId: (page - 1) * 10 + i + 101,
          title: query ? `${query} (TMDB) ${i + 1}` : `TMDB 영화 ${i + 1}`,
          originalTitle: null,
          posterPath: null,
          year: 2024,
        })),
      });
    }),

    // ===== 리뷰 API =====
    http.get(/\/api\/v1\/reviews\/my(\?.*)?$/, ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? "0");
      const size = Number(url.searchParams.get("size") ?? "10");

      // 페이지네이션을 고려한 동적 데이터 생성
      const items = Array.from({ length: size }).map((_, idx) => {
        const globalIndex = page * size + idx;
        return {
          id: globalIndex + 1,
          userSeq: 1,
          movieId: 12345 + globalIndex,
          rating: Math.floor(Math.random() * 5) + 1, // 1-5점 랜덤
          reason: `리뷰 내용 ${globalIndex + 1}`,
          tags: ["SF", "액션", "드라마"].slice(
            0,
            Math.floor(Math.random() * 3) + 1,
          ),
          watchedAt: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          createdAt: new Date().toISOString(),
        };
      });

      return HttpResponse.json({
        content: items,
        page,
        size,
        totalElements: 100,
        totalPages: 10,
      });
    }),

    http.post(/\/api\/v1\/reviews$/, async ({ request }) => {
      try {
        const body = (await request.json()) as ReviewCreateInput;

        // 입력 데이터 검증 (간단한 예시)
        if (!body.movieId || !body.rating) {
          const fieldErrors: Record<string, string> = {};
          if (!body.movieId) {
            fieldErrors.movieId = "movieId는 필수입니다.";
          }
          if (!body.rating) {
            fieldErrors.rating = "rating은 필수입니다.";
          }

          return HttpResponse.json(
            {
              code: CommonErrorCode.VALIDATION_ERROR,
              message: "필수 필드가 누락되었습니다.",
              details: {
                path: "/api/v1/reviews",
                fieldErrors,
              },
              traceId: crypto.randomUUID(),
            },
            { status: 400 },
          );
        }

        return HttpResponse.json(
          {
            id: Math.floor(Math.random() * 100000),
            ...body,
            createdAt: new Date().toISOString(),
          },
          { status: 201 },
        );
      } catch {
        return HttpResponse.json(
          {
            code: CommonErrorCode.VALIDATION_ERROR,
            message: "잘못된 JSON 형식입니다.",
            details: {
              path: "/api/v1/reviews",
            },
            traceId: crypto.randomUUID(),
          },
          { status: 400 },
        );
      }
    }),

    // ===== 에러 핸들링 =====
    http.get(/\/api\/v[12]\/.*/, ({ request }) => {
      return HttpResponse.json(
        {
          code: CommonErrorCode.NOT_FOUND,
          message: "API 엔드포인트를 찾을 수 없습니다.",
          details: {
            path: new URL(request.url).pathname,
          },
          traceId: crypto.randomUUID(),
        },
        { status: 404 },
      );
    }),
  ];
}
