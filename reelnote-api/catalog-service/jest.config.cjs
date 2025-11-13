const { readFileSync } = require("fs");
const { join } = require("path");

const swcJestConfig = JSON.parse(
  readFileSync(join(__dirname, ".spec.swcrc"), "utf-8"),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: "catalog-service",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["@swc/jest", swcJestConfig],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "test-output/jest/coverage",
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  passWithNoTests: true,
};
