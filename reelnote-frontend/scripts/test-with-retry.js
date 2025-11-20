const { spawn } = require("child_process");
const path = require("path");

/**
 * Vitest 포크 풀 타임아웃 에러를 감지하고 자동 재시도하는 스크립트
 *
 * 문제: Windows에서 첫 실행 시 포크 풀 초기화가 느려서 타임아웃 발생
 * 해결: 포크 풀 타임아웃 에러 감지 시 자동으로 재시도 (최대 2회)
 */

const MAX_RETRIES = 2;
const FORK_TIMEOUT_ERROR_PATTERNS = [
  "Timeout starting forks runner",
  "[vitest-pool]: Timeout",
  "Timeout starting forks",
];

let retryCount = 0;

/**
 * stderr를 캡처하면서도 stdout은 그대로 출력하는 방식으로 실행
 */
function runVitestWithErrorCapture() {
  return new Promise((resolve, reject) => {
    const vitestProcess = spawn("vitest", process.argv.slice(2), {
      stdio: ["inherit", "inherit", "pipe"],
      shell: true,
      cwd: path.resolve(__dirname, ".."),
    });

    let stderrOutput = "";

    // stderr 캡처
    vitestProcess.stderr.on("data", (data) => {
      const output = data.toString();
      stderrOutput += output;
      // stderr도 화면에 출력 (에러 메시지 확인용)
      process.stderr.write(data);
    });

    vitestProcess.on("error", (error) => {
      reject(error);
    });

    vitestProcess.on("close", (code) => {
      // 포크 풀 타임아웃 에러 패턴 확인
      const isForkTimeoutError = FORK_TIMEOUT_ERROR_PATTERNS.some((pattern) =>
        stderrOutput.includes(pattern),
      );

      if (code !== 0 && isForkTimeoutError && retryCount < MAX_RETRIES) {
        resolve({ code, shouldRetry: true, isForkTimeout: true });
      } else if (code !== 0 && retryCount < MAX_RETRIES) {
        // 포크 타임아웃이 아니지만 첫 번째 실패면 재시도 (안전장치)
        resolve({ code, shouldRetry: true, isForkTimeout: false });
      } else {
        resolve({ code, shouldRetry: false, isForkTimeout: false });
      }
    });
  });
}

/**
 * 메인 실행 함수
 */
async function main() {
  while (retryCount <= MAX_RETRIES) {
    if (retryCount > 0) {
      console.log(
        `\n⚠️  포크 풀 타임아웃 감지. 재시도 중... (${retryCount}/${MAX_RETRIES})`,
      );
      // 재시도 전 짧은 대기 (프로세스 정리 시간)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    try {
      const result = await runVitestWithErrorCapture();

      if (result.code === 0) {
        // 성공
        process.exit(0);
      } else if (result.shouldRetry) {
        // 재시도 가능
        retryCount++;
        if (result.isForkTimeout) {
          console.log(`\n🔄 포크 풀 타임아웃 에러 감지. 자동 재시도합니다...`);
        }
      } else {
        // 재시도 불가능 또는 최대 재시도 횟수 초과
        if (retryCount >= MAX_RETRIES) {
          console.error(
            `\n❌ 최대 재시도 횟수(${MAX_RETRIES})를 초과했습니다.`,
          );
        }
        process.exit(result.code);
      }
    } catch (error) {
      console.error("테스트 실행 중 오류 발생:", error);
      process.exit(1);
    }
  }
}

main();
