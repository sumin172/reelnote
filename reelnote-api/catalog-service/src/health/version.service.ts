import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 버전 정보 서비스
 * package.json에서 버전을 읽어서 메모리에 캐시
 */
@Injectable()
export class VersionService implements OnModuleInit {
  private readonly logger = new Logger(VersionService.name);
  private version = "unknown";

  onModuleInit() {
    try {
      const packageJsonPath = join(process.cwd(), "package.json");
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf-8"),
      ) as { version?: string };
      this.version = packageJson.version || "unknown";
      this.logger.log(`Service version: ${this.version}`);
    } catch (error) {
      this.logger.warn(
        `Failed to read version from package.json: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      this.version = "unknown";
    }
  }

  getVersion(): string {
    return this.version;
  }
}
