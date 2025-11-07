import { http, HttpResponse } from "msw";
import type { RequestHandler } from "msw";
import type { ReviewCreateInput } from "@/domains/review/schema";

/**
 * MSW 핸들러 생성 함수
 *
 * 현재 프로젝트 규모(3개 엔드포인트)에 적합한 단일 파일 구조
 * 향후 10개 이상의 엔드포인트가 생기면 도메인별 분리 고려
 */
export function createHandlers(): RequestHandler[] {
  return [
    // ===== 카탈로그 API =====
    http.get(/\/api\/v1\/movies\/search(\?.*)?$/, ({ request }) => {
      const url = new URL(request.url);
      const query = url.searchParams.get("query") ?? "";
      const page = Number(url.searchParams.get("page") ?? "1");

      // 검색어에 따른 동적 결과 생성
      const results = Array.from({ length: 10 }).map((_, i) => ({
        id: (page - 1) * 10 + i + 1,
        title: query ? `${query} 관련 영화 ${i + 1}` : `영화 ${i + 1}`,
        posterPath: null,
        overview: `이것은 ${query || "일반"} 영화에 대한 설명입니다.`,
        releaseDate: "2024-01-01",
      }));

      return HttpResponse.json({
        page,
        totalPages: 5,
        totalResults: 50,
        results,
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
          return HttpResponse.json(
            { error: "필수 필드가 누락되었습니다." },
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
          { error: "잘못된 JSON 형식입니다." },
          { status: 400 },
        );
      }
    }),

    // ===== 에러 핸들링 =====
    http.get(/\/api\/v1\/.*/, ({ request }) => {
      console.warn(`🚨 MSW: 처리되지 않은 API 요청: ${request.url}`);
      return HttpResponse.json(
        { error: "API 엔드포인트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }),
  ];
}
