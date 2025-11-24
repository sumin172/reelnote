import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const generatedDir = resolve(root, "packages/api-schema/generated");

const args = process.argv.slice(2);
const onlyClean = args.includes("--clean");

function cleanGenerated() {
  rmSync(generatedDir, { recursive: true, force: true });
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Command "${command} ${commandArgs.join(" ")}" exited with status ${
        result.status ?? "unknown"
      }`,
    );
  }
}

if (onlyClean) {
  cleanGenerated();
  console.log("api-schema: cleaned generated artifacts");
  process.exit(0);
}

cleanGenerated();
ensureDir(generatedDir);

console.log("Generating catalog-service OpenAPI spec...");
run("pnpm", ["--filter", "catalog-service", "run", "generate:openapi"]);

const catalogSpecPath = resolve(
  root,
  "packages/api-schema/generated/catalog-service-openapi.json",
);
if (!existsSync(catalogSpecPath)) {
  throw new Error(
    "Catalog service OpenAPI spec was not generated. Check generate:openapi script.",
  );
}

console.log("Generating review-service OpenAPI spec...");
run("node", [
  "tools/scripts/run-gradlew.mjs",
  "reelnote-api/review-service",
  "generateOpenApiDocs",
]);

const reviewSpecPath = resolve(
  root,
  "packages/api-schema/generated/review-service-openapi.json",
);
if (!existsSync(reviewSpecPath)) {
  throw new Error(
    "Review service OpenAPI spec was not generated. Check generateOpenApiDocs task and build.gradle.kts outputDir setting.",
  );
}

console.log("api-schema generation completed successfully.");

// Optionally persist manifest for consumers
const manifestPath = join(generatedDir, "manifest.json");
writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      artifacts: {
        catalog: "catalog-service-openapi.json",
        review: "review-service-openapi.json",
      },
    },
    null,
    2,
  ),
);
