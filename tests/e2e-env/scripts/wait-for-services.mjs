import { createConnection } from "net";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnvFile } from "../../../tools/scripts/env-loader.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * .env.e2e 파일에서 환경 변수 로드
 * @returns {{}|{}} 환경 변수 객체
 */
function loadEnv() {
  const envPath = resolve(__dirname, "../../.env.e2e");
  return parseEnvFile(envPath, { required: true });
}

/**
 * 포트가 열릴 때까지 대기
 */
function waitForPort(port, host = "localhost") {
  return new Promise((resolve, reject) => {
    const maxAttempts = 60;
    let attempts = 0;
    const interval = 1000;

    const tryConnect = () => {
      const socket = createConnection(port, host);

      socket.on("connect", () => {
        socket.end();
        resolve();
      });

      socket.on("error", () => {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(
            new Error(
              `Port ${port} on ${host} did not open within ${maxAttempts} seconds`,
            ),
          );
        } else {
          setTimeout(tryConnect, interval);
        }
      });
    };

    tryConnect();
  });
}

/**
 * 헬스체크 엔드포인트 확인
 */
async function waitForHealthCheck(url, serviceName) {
  const maxAttempts = 60;
  let attempts = 0;
  const interval = 1000;

  while (attempts < maxAttempts) {
    try {
      // Catalog Service와 Review Service 모두 health 엔드포인트는 global prefix 제외
      const healthUrl = `${url}/health/ready`;
      const response = await fetch(healthUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "UP") {
          console.log(`✅ ${serviceName} is ready (${url})`);
          return;
        }
      }
    } catch (error) {
      // 서버가 아직 준비되지 않음
    }

    attempts++;
    if (attempts % 10 === 0) {
      process.stdout.write(".");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `${serviceName} (${url}) did not become ready within ${maxAttempts} seconds`,
  );
}

/**
 * Review Service 헬스체크
 */
async function waitForReviewServiceHealth(url, serviceName) {
  const maxAttempts = 60;
  let attempts = 0;
  const interval = 1000;

  while (attempts < maxAttempts) {
    try {
      // Review Service의 PublicHealthController는 WebMvcConfig에서 제외되어 /health/ready로 접근
      const response = await fetch(`${url}/health/ready`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "UP") {
          console.log(`✅ ${serviceName} is ready (${url})`);
          return;
        }
      }
    } catch (error) {
      // 서버가 아직 준비되지 않음
    }

    attempts++;
    if (attempts % 10 === 0) {
      process.stdout.write(".");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `${serviceName} (${url}) did not become ready within ${maxAttempts} seconds`,
  );
}

/**
 * 메인 함수
 */
async function main() {
  const env = loadEnv();
  const catalogUrl = env["CATALOG_BASE_URL"] || "http://localhost:4100";
  const reviewUrl = env["REVIEW_BASE_URL"] || "http://localhost:5100";

  console.log("\n⏳ 서비스 준비 대기 중...\n");
  console.log(`Catalog Service: ${catalogUrl}`);
  console.log(`Review Service: ${reviewUrl}\n`);

  try {
    // 1. 포트가 열릴 때까지 대기 (빠른 실패 감지)
    const catalogPort = new URL(catalogUrl).port || 4100;
    const reviewPort = new URL(reviewUrl).port || 5100;

    console.log("포트 확인 중...");
    await Promise.all([
      waitForPort(Number(catalogPort)),
      waitForPort(Number(reviewPort)),
    ]);
    console.log("✅ 포트가 열렸습니다\n");

    // 2. 헬스체크로 실제 준비 상태 확인
    console.log("헬스체크 확인 중...");
    await Promise.all([
      waitForHealthCheck(catalogUrl, "Catalog Service"),
      waitForReviewServiceHealth(reviewUrl, "Review Service"),
    ]);

    console.log("\n✅ 모든 서비스가 준비되었습니다!\n");
  } catch (error) {
    console.error(`\n❌ 오류: ${error.message}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("예상치 못한 오류:", error);
  process.exit(1);
});

