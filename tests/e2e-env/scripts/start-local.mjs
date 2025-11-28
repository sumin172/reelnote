import { spawn, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../../..");

// 실행 중인 프로세스 추적
const processes = [];

/**
 * 프로세스 종료 핸들러
 */
function cleanup(exitCode = 0) {
  console.log("\n\n🛑 서비스 종료 중...\n");
  processes.forEach((proc) => {
    try {
      proc.kill("SIGTERM");
    } catch (error) {
      // 무시
    }
  });
  process.exit(exitCode);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

/**
 * 환경 변수 병합
 */
function mergeEnv() {
  const mergeScript = resolve(__dirname, "../config/merge-env.mjs");
  const result = spawnSync("node", [mergeScript, "local"], {
    stdio: "inherit",
    cwd: rootDir,
  });

  if (result.status !== 0) {
    throw new Error("환경 변수 병합 실패");
  }
}

/**
 * 데이터베이스 마이그레이션
 */
function setupDatabase() {
  const setupScript = resolve(__dirname, "setup-db.mjs");
  const result = spawnSync("node", [setupScript], {
    stdio: "inherit",
    cwd: rootDir,
  });

  if (result.status !== 0) {
    throw new Error("데이터베이스 마이그레이션 실패");
  }
}

/**
 * 서비스 실행
 */
function startService(name, command, args, cwd, env = {}) {
  console.log(`\n🚀 ${name} 시작 중...\n`);

  const proc = spawn(command, args, {
    cwd: resolve(rootDir, cwd),
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  proc.on("error", (error) => {
    console.error(`❌ ${name} 시작 실패:`, error.message);
    cleanup();
  });

  processes.push(proc);
  return proc;
}

/**
 * 메인 함수
 */
async function main() {
  console.log("🎬 E2E 로컬 환경 시작\n");

  try {
    // 1. 환경 변수 병합
    console.log("📝 환경 변수 병합...");
    mergeEnv();
    console.log("✅ 환경 변수 병합 완료\n");

    // 2. 데이터베이스 마이그레이션
    console.log("🗄️  데이터베이스 마이그레이션...");
    setupDatabase();
    console.log("✅ 데이터베이스 마이그레이션 완료\n");

    // 3. 서비스 실행
    const envPath = resolve(__dirname, "../../.env.e2e");
    if (!existsSync(envPath)) {
      console.error(`\n❌ 오류: 환경 변수 파일을 찾을 수 없습니다\n`);
      cleanup(1);
      return;
    }

    // 환경 변수 로드 (간단한 방식)
    const envContent = readFileSync(envPath, "utf-8");
    const envVars = {};
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    }

    // Catalog Service 실행
    startService(
      "Catalog Service",
      "pnpm",
      ["nx", "serve", "catalog-service"],
      ".",
      {
        ...envVars,
        PORT: envVars["PORT"] || "4100",
      },
    );

    // Review Service 실행
    startService(
      "Review Service",
      "pnpm",
      ["nx", "serve", "review-service"],
      ".",
      {
        ...envVars,
        SPRING_PROFILES_ACTIVE: "e2e",
      },
    );

    // 4. 헬스체크 대기
    console.log("\n⏳ 서비스 준비 대기 중...\n");
    const waitScript = resolve(__dirname, "wait-for-services.mjs");
    const waitResult = spawnSync("node", [waitScript], {
      stdio: "inherit",
      cwd: rootDir,
    });

    if (waitResult.status !== 0) {
      console.error(`\n❌ 오류: 서비스 준비 실패\n`);
      cleanup(1);
      return;
    }

    console.log("\n✅ 모든 서비스가 준비되었습니다!");
    console.log("\n📌 서비스 정보:");
    console.log(`   Catalog Service: ${envVars["CATALOG_BASE_URL"] || "http://localhost:4100"}`);
    console.log(`   Review Service: ${envVars["REVIEW_BASE_URL"] || "http://localhost:5100"}`);
    console.log("\n종료하려면 Ctrl+C를 누르세요.\n");
  } catch (error) {
    console.error(`\n❌ 오류: ${error.message}\n`);
    cleanup(1);
  }
}

main().catch((error) => {
  console.error(`\n❌ 치명적 오류: ${error.message}\n`);
  process.exit(1);
});

