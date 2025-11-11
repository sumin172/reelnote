import { test, expect } from "@playwright/test";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("카탈로그 검색 결과가 표시된다", async ({ page }) => {
  await test.step("검색 API 모킹 설정", async () => {
    await page.route("**/search**", async (route) => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get("q") ?? "";

      console.info(`[mock:catalog-search] q="${query}"`);
      await delay(150);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          page: 1,
          query,
          local: [
            {
              tmdbId: 1,
              title: `${query || "샘플"} 영화`,
              year: 2024,
            },
          ],
          tmdb: [],
        }),
      });
    });
  });

  await page.goto("/catalog");
  await page.getByPlaceholder("영화 제목을 입력하세요").fill("inception");

  await page.waitForResponse(
    (response) =>
      response.url().includes("/search") &&
      response.request().method() === "GET" &&
      response.status() === 200,
  );

  await expect(
    page.getByRole("heading", { name: "카탈로그 검색" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "카탈로그", level: 2 }),
  ).toBeVisible();
  await expect(page.getByText("inception 영화")).toBeVisible();

  await test.step("검색 결과 스크린샷", async () => {
    await test.info().attach("catalog-search-result", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
