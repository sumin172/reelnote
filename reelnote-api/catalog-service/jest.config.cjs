const { readFileSync } = require("fs");
const { join } = require("path");

const nestPreset = require("../../tools/nestjs/jest.preset.cjs");

// SWC 설정 로드 (NestJS preset에서 transform을 제공하지만,
// 프로젝트별 SWC 옵션(.spec.swcrc)이 필요한 경우 여기서 확장)
const swcJestConfig = JSON.parse(
  readFileSync(join(__dirname, ".spec.swcrc"), "utf-8"),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  ...nestPreset,
  // 프로젝트별 설정
  displayName: "catalog-service",
  coverageDirectory: "test-output/jest/coverage",
  collectCoverage: true,
  coverageProvider: "v8", // SWC와 호환되도록 V8 커버리지 프로바이더 사용
  coverageReporters: ["text", "lcov", "html", "json"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "\\.spec\\.ts$",
    "\\.test\\.ts$",
  ],
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  passWithNoTests: true,
  // 프로젝트별 SWC 설정이 필요한 경우 transform 오버라이드
  transform: {
    "^.+\\.[tj]s$": ["@swc/jest", swcJestConfig],
  },
};
