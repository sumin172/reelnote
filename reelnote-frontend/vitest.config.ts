import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // __tests__ 폴더와 co-located 패턴 모두 커버
    // 기본 패턴: **/*.{test,spec}.{ts,tsx} (co-located)
    //            **/__tests__/**/*.{test,spec}.{ts,tsx} (__tests__ 폴더)
    // 명시적으로 설정하려면:
    // include: [
    //   "**/__tests__/**/*.test.{ts,tsx}",
    //   "**/*.test.{ts,tsx}",
    // ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      "**/tests/e2e/**", // Playwright E2E 테스트 제외
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
