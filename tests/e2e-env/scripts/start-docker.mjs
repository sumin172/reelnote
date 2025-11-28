import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../../..");
const dockerDir = resolve(__dirname, "../docker");

/**
 * 환경 변수 병합
 */
function mergeEnv() {
  const mergeScript = resolve(__dirname, "../config/merge-env.mjs");
  const result = spawnSync("node", [mergeScript, "docker"], {
    stdio: "inherit",
    cwd: rootDir,
  });

  if (result.status !== 0) {
    throw new Error("환경 변수 병합 실패");
  }
}

/**
 * Docker Compose 실행
 */
function startDocker() {
  console.log("\n🐳 Docker Compose 시작 중...\n");

  const result = spawnSync(
    "docker",
    ["compose", "up", "-d"],
    {
      cwd: dockerDir,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error("Docker Compose 시작 실패");
  }
}

/**
 * 메인 함수
 */
function main() {
  console.log("🎬 E2E Docker 환경 시작\n");

  try {
    // 1. 환경 변수 병합
    console.log("📝 환경 변수 병합...");
    mergeEnv();
    console.log("✅ 환경 변수 병합 완료\n");

    // 2. Docker Compose 시작
    console.log("🐳 Docker Compose 시작...");
    startDocker();
    console.log("✅ Docker Compose 시작 완료\n");

    console.log("✅ E2E Docker 환경이 준비되었습니다!");
    console.log("\n📌 서비스 정보:");
    console.log("   PostgreSQL: localhost:5434");
    console.log("   Redis: localhost:6380");
    console.log("\n컨테이너 상태 확인: docker compose -f tests/e2e-env/docker/docker-compose.yml ps");
    console.log("로그 확인: docker compose -f tests/e2e-env/docker/docker-compose.yml logs -f");
    console.log("종료: docker compose -f tests/e2e-env/docker/docker-compose.yml down\n");
  } catch (error) {
    console.error(`\n❌ 오류: ${error.message}\n`);
    process.exit(1);
  }
}

main();




