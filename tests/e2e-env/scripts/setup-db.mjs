import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "../../../tools/scripts/env-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../../..");

/**
 * .env.e2e 파일에서 환경 변수 로드
 */
function loadEnv() {
  const envPath = resolve(__dirname, "../../.env.e2e");
  return parseEnvFile(envPath, { required: true });
}

/**
 * 명령 실행
 */
function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    ...options,
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: options.cwd || rootDir,
  });

  if (result.error) {
    throw new Error(`명령 실행 실패: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`명령 실패: ${command} ${args.join(" ")}`);
  }
}

/**
 * 메인 함수
 */
function main() {
  const env = loadEnv();

  console.log("\n🗄️  데이터베이스 마이그레이션 시작...\n");

  try {
    // 1. Catalog Service Prisma 마이그레이션
    console.log("📦 Catalog Service: Prisma 마이그레이션...");
    runCommand(
      "pnpm",
      ["exec", "prisma", "migrate", "deploy"],
      {
        cwd: resolve(rootDir, "reelnote-api/catalog-service"),
        env: { ...process.env, CATALOG_DB_URL: env.CATALOG_DB_URL },
      },
    );
    console.log("✅ Catalog Service 마이그레이션 완료\n");

    // 2. Review Service는 Spring Boot 시작 시 Flyway가 자동으로 마이그레이션 수행
    // 별도 작업 불필요
    console.log("✅ Review Service: Flyway는 서비스 시작 시 자동 마이그레이션\n");

    console.log("✅ 모든 데이터베이스 마이그레이션 완료!\n");
  } catch (error) {
    console.error(`\n❌ 오류: ${error.message}\n`);
    process.exit(1);
  }
}

main();




