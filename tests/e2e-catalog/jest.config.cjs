// e2e-catalog Jest configuration
// NestJS preset 사용 (SWC 설정 포함)
const nestPreset = require("../../tools/nestjs/jest.preset.cjs");

module.exports = {
  ...nestPreset,
  // e2e 테스트 전용 설정
  displayName: "e2e-catalog",
  globalSetup: "<rootDir>/src/support/global-setup.ts",
  globalTeardown: "<rootDir>/src/support/global-teardown.ts",
  setupFiles: ["<rootDir>/src/support/test-setup.ts"],
  // SWC transform은 nestPreset에서 제공됨
  coverageDirectory: "test-output/jest/coverage",
};



