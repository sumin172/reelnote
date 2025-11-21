const nestPreset = require("../../tools/nestjs/jest.preset.cjs");

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
  // SWC transform은 nestPreset에서 제공됨
};
