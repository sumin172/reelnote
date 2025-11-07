import { test, expect } from "@playwright/test";

test("카탈로그 검색 결과가 표시된다", async ({ page }) => {
  await page.route("**/api/v1/movies/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("query") ?? "";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        page: 1,
        totalPages: 1,
        totalResults: 1,
        results: [
          {
            id: 1,
            title: `${query || "샘플"} 영화`,
            releaseDate: "2024-01-01",
          },
        ],
      }),
    });
  });

  await page.goto("/catalog");
  await page.getByPlaceholder("영화 제목을 입력하세요").fill("inception");
  await expect(page.getByText("검색 중...")).toBeVisible();
  await expect(page.locator("li >> nth=0")).toBeVisible();
});
