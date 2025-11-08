import { test, expect } from "@playwright/test";

test("리뷰 목록 페이지가 렌더되고 카드가 보인다", async ({ page }) => {
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

  await page.goto("/reviews");
  await expect(page.getByRole("heading", { name: "리뷰 목록" })).toBeVisible();
  await expect(page.locator("li").first()).toBeVisible();
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

        if (
          typeof url === "string" &&
          /\/(api\/)?v1\/reviews$/.test(url) &&
          method === "POST"
        ) {
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

  await page.goto("/reviews");
  await page.getByRole("link", { name: "새 리뷰 작성" }).click();
  await page.getByLabel("영화 ID").fill("12345");
  await page.getByLabel("평점(1~5)").fill("4");
  await page.getByLabel("리뷰 내용").fill("플레이wright 테스트");
  await page.getByLabel("감상일(YYYY-MM-DD)").fill("2024-01-15");
  await page.getByRole("button", { name: "등록" }).click();
  await expect(page).toHaveURL(/\/reviews$/);
});
