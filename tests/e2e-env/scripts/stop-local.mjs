import { execSync } from "node:child_process";

/**
 * 프로세스 종료 (Windows/Linux/Mac 호환)
 */
function killProcessesByPort(ports) {
  const platform = process.platform;

  for (const port of ports) {
    try {
      if (platform === "win32") {
        // Windows: netstat으로 PID 찾고 taskkill로 종료
        const result = execSync(
          `netstat -ano | findstr :${port}`,
          { encoding: "utf-8" },
        );
        const lines = result.trim().split("\n");
        const pids = new Set();

        for (const line of lines) {
          const match = line.match(/\s+(\d+)\s*$/);
          if (match) {
            pids.add(match[1]);
          }
        }

        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
            console.log(`✅ 포트 ${port}의 프로세스 종료 (PID: ${pid})`);
          } catch (error) {
            // 프로세스가 이미 종료되었을 수 있음
          }
        }
      } else {
        // Linux/Mac: lsof로 PID 찾고 kill로 종료
        const result = execSync(
          `lsof -ti :${port}`,
          { encoding: "utf-8" },
        );
        const pids = result.trim().split("\n").filter(Boolean);

        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
            console.log(`✅ 포트 ${port}의 프로세스 종료 (PID: ${pid})`);
          } catch (error) {
            // 프로세스가 이미 종료되었을 수 있음
          }
        }
      }
    } catch (error) {
      // 포트를 사용하는 프로세스가 없을 수 있음
      console.log(`ℹ️  포트 ${port}를 사용하는 프로세스가 없습니다`);
    }
  }
}

/**
 * 메인 함수
 */
function main() {
  console.log("🛑 E2E 로컬 환경 종료 중...\n");

  // E2E 서비스 포트
  const ports = [4100, 5100];

  killProcessesByPort(ports);

  console.log("\n✅ 종료 완료\n");
}

main();




