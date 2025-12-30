import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

// e2e 테스트 전용 포트 (개발 서버 3000과 분리)
const baseURL = process.env.FRONT_BASE_URL ?? "http://localhost:3100";

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 2,
  reporter: [
    ["list"],
    ["html"], // HTML 리포트 생성으로 상세 로그 확인 가능
    // 플래키 분석을 위한 JSON 리포트 (로컬과 CI 모두)
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL,
    // retry 발생 시 trace 저장하여 플래키 원인 분석
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
    // 타임아웃 설정으로 불안정한 대기 시간 문제 방지
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  // e2e 테스트 전용 서버 자동 시작 (3100 포트, 개발 서버 3000과 분리)
  webServer: {
    command: "pnpm next dev -p 3100",
    cwd: resolve(__dirname, "../../reelnote-frontend"),
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
