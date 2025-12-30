import { test, expect } from "@playwright/test";

test("카탈로그 검색 결과가 표시된다", async ({ page }) => {
  // 검색 API 모킹 설정 - 인위적 지연 제거, 즉시 응답
  await page.route("**/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";

    console.info(`[mock:catalog-search] q="${query}"`);

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

  await page.goto("/catalog", { waitUntil: "networkidle" });

  // 검색 입력 및 응답 대기 - 더 명확한 조건
  const searchInput = page.getByPlaceholder("영화 제목을 입력하세요");
  await searchInput.fill("inception");

  // 검색 API 응답을 명확하게 대기
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/search") &&
      response.request().method() === "GET" &&
      response.status() === 200,
  );

  // 응답이 완료될 때까지 대기
  await responsePromise;

  // UI가 렌더링될 때까지 명확하게 대기
  await expect(
    page.getByRole("heading", { name: "카탈로그 검색" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "카탈로그", level: 2 }),
  ).toBeVisible();

  // 검색 결과가 표시될 때까지 대기 (더 명확한 조건)
  await expect(page.getByText("inception 영화")).toBeVisible({ timeout: 5000 });

  await test.step("검색 결과 스크린샷", async () => {
    await test.info().attach("catalog-search-result", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
