import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dockerDir = resolve(__dirname, "../docker");

/**
 * Docker Compose 종료
 */
function stopDocker() {
  console.log("\n🛑 Docker Compose 종료 중...\n");

  const result = spawnSync(
    "docker",
    ["compose", "down"],
    {
      cwd: dockerDir,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    throw new Error("Docker Compose 종료 실패");
  }
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




