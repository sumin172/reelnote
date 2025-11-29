import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dockerDir = resolve(__dirname, "../docker");

/**
 * 공통 Docker 명령 실행 유틸
 */
function runDocker(args, { ignoreError = false } = {}) {
  const result = spawnSync("docker", args, {
    cwd: dockerDir,
    stdio: "inherit",
  });

  if (!ignoreError && result.status !== 0) {
    throw new Error(`Docker 명령 실패: docker ${args.join(" ")}`);
  }

  return result;
}

/**
 * Docker Compose 종료
 */
function stopDocker() {
  console.log("\n🛑 Docker Compose 종료 중...\n");

  // 1) docker-compose.yml 기준 전체 스택 종료
  runDocker(["compose", "down"]);

  // 2) 혹시 남아 있을 수 있는 서비스 전용 컨테이너 강제 정리
  //    - catalog-service-e2e
  //    - review-service-e2e
  // 존재하지 않으면 에러를 무시하고 넘어갑니다.
  console.log("\n🧹 남아 있을 수 있는 서비스 컨테이너 추가 정리...\n");
  runDocker(
    ["rm", "-f", "catalog-service-e2e", "review-service-e2e"],
    { ignoreError: true },
  );
}

/**
 * 메인 함수
 */
function main() {
  console.log("🎬 E2E Docker 환경 종료\n");

  try {
    stopDocker();
    console.log("\n✅ Docker Compose 종료 완료\n");
  } catch (error) {
    console.error(`\n❌ 오류: ${error.message}\n`);
    process.exit(1);
  }
}

main();




