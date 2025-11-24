import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(currentDir, "..", "generated");

export const catalogServiceOpenApiPath = join(
  generatedDir,
  "catalog-service-openapi.json",
);

export const reviewServiceOpenApiPath = join(
  generatedDir,
  "review-service-openapi.json",
);

export function readCatalogServiceSpec(): string {
  return readFileSync(catalogServiceOpenApiPath, "utf-8");
}

export function readReviewServiceSpec(): string {
  return readFileSync(reviewServiceOpenApiPath, "utf-8");
}

export function readManifest<T = unknown>(): T | undefined {
  try {
    const manifestPath = join(generatedDir, "manifest.json");
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

