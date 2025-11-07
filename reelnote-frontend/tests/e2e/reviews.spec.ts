import { test, expect } from "@playwright/test";

test("리뷰 목록 페이지가 렌더되고 카드가 보인다", async ({ page }) => {
  await page.goto("/reviews");
  await expect(page.getByRole("heading", { name: "리뷰 목록" })).toBeVisible();
  await expect(page.locator("li >> nth=0")).toBeVisible();
});

test("리뷰 작성 플로우", async ({ page }) => {
  await page.goto("/reviews");
  await page.getByRole("link", { name: "새 리뷰 작성" }).click();
  await page.getByLabel("영화 ID").fill("12345");
  await page.getByLabel("평점(1~5)").fill("4");
  await page.getByLabel("리뷰 내용").fill("플레이wright 테스트");
  await page.getByLabel("감상일(YYYY-MM-DD)").fill("2024-01-15");
  await page.getByRole("button", { name: "등록" }).click();
  await expect(page).toHaveURL(/\/reviews$/);
});
