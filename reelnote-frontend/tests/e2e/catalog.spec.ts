import { test, expect } from '@playwright/test';

test('카탈로그 검색 결과가 표시된다', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByPlaceholder('영화 제목을 입력하세요').fill('inception');
  await expect(page.getByText('검색 중...')).toBeVisible();
  await expect(page.locator('li >> nth=0')).toBeVisible();
});


