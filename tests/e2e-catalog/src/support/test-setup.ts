import axios from "axios";
import { existsSync } from "fs";
import { catalogServiceOpenApiPath } from "@reelnote/api-schema";

function setupAxios() {
  const baseUrl = process.env.CATALOG_BASE_URL ?? "http://localhost:4100";
  axios.defaults.baseURL = baseUrl.replace(/\/$/, "");

  if (!existsSync(catalogServiceOpenApiPath)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[e2e-catalog] OpenAPI spec not found at ${catalogServiceOpenApiPath}. Run "pnpm api-schema:generate" if contract checks rely on it.`,
    );
  }
}

// Jest setupFiles에서 자동 실행되도록 즉시 호출
setupAxios();
