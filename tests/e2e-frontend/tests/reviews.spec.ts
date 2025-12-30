import { test, expect } from "@playwright/test";

test("리뷰 목록 페이지가 렌더되고 카드가 보인다", async ({ page }) => {
  // API 응답을 명확하게 대기하기 위해 route를 먼저 설정
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/v1/reviews/my") && response.status() === 200,
  );

  await page.route("**/v1/reviews/my**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: [
          {
            id: 1,
            userSeq: 1,
            movieId: 777,
            rating: 4,
            reason: "테스트 리뷰",
            tags: ["테스트"],
            watchedAt: "2024-01-01",
            createdAt: "2024-01-02T00:00:00Z",
          },
        ],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      }),
    });
  });

  await page.goto("/reviews", { waitUntil: "networkidle" });

  // API 응답 완료 대기
  await responsePromise;

  // UI 렌더링 대기
  await expect(page.getByRole("heading", { name: "리뷰 목록" })).toBeVisible();
  await expect(page.locator("li").first()).toBeVisible({ timeout: 5000 });
});

test("리뷰 작성 플로우", async ({ page }) => {
  await page.route("**/v1/reviews/my**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
      }),
    });
  });

  await page.addInitScript(
    ({ responseBody }) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const request =
          typeof input === "string" || input instanceof URL
            ? null
            : (input as Request);
        const url = request ? request.url : String(input);
        const method = (init?.method ?? request?.method ?? "GET").toUpperCase();

        if (/\/(api\/)?v1\/reviews$/.test(url) && method === "POST") {
          return new Response(JSON.stringify(responseBody), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }

        return originalFetch(input, init);
      };
    },
    {
      responseBody: {
        id: 999,
        movieId: 12345,
        rating: 4,
        reason: "플레이wright 테스트",
        tags: [],
        watchedAt: "2024-01-15",
        createdAt: "2024-01-15T00:00:00Z",
      },
    },
  );

  await page.goto("/reviews", { waitUntil: "networkidle" });

  // 새 리뷰 작성 페이지로 이동
  await page.getByRole("link", { name: "새 리뷰 작성" }).click();
  await expect(page).toHaveURL(/\/reviews\/new/);

  // 폼 입력
  await page.getByLabel("영화 ID").fill("12345");
  await page.getByLabel("평점(1~5)").fill("4");
  await page.getByLabel("리뷰 내용").fill("플레이wright 테스트");
  await page.getByLabel("감상일(YYYY-MM-DD)").fill("2024-01-15");

  // 등록 버튼 클릭 및 리다이렉트 대기
  await page.getByRole("button", { name: "등록" }).click();

  // 리다이렉트 완료 대기
  await expect(page).toHaveURL(/\/reviews$/, { timeout: 5000 });

  // 성공적으로 리뷰 목록으로 돌아왔는지 확인
  await expect(page.getByRole("heading", { name: "리뷰 목록" })).toBeVisible();
});
