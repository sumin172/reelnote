import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("validateEnv", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    // process.env 초기화
    process.env = { ...originalEnv };
    // process.exit 모킹 (실제로 종료되지 않도록)
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    // console.error 모킹 (테스트 출력을 깔끔하게 유지)
    // validateEnv()가 검증 실패 시 console.error를 호출하지만, 테스트에서는 출력하지 않음
    vi.spyOn(console, "error").mockImplementation(() => {
      // 테스트에서는 stderr 출력 억제
    });
    // 캐시 초기화를 위해 모듈 재로드 시뮬레이션
    // validatedEnv 캐시를 리셋하기 위해 모듈을 다시 import
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe("클라이언트 사이드", () => {
    it("should return default values in browser environment", async () => {
      // window 객체가 있는 환경 시뮬레이션
      const originalWindow = global.window;
      (global as { window?: unknown }).window = {};

      try {
        // 모듈을 다시 import하여 캐시 초기화
        const { validateEnv } = await import("../validation");
        const result = validateEnv();

        expect(result).toBeDefined();
        expect(result.NEXT_PUBLIC_REVIEW_API_BASE_URL).toBe("");
        expect(result.NEXT_PUBLIC_REVIEW_API_TIMEOUT).toBe(10000);
        expect(result.NEXT_PUBLIC_REVIEW_API_RETRY).toBe(3);
        expect(result.NEXT_PUBLIC_CATALOG_API_BASE_URL).toBe("");
        expect(result.NEXT_PUBLIC_CATALOG_API_TIMEOUT).toBe(10000);
        expect(result.NEXT_PUBLIC_CATALOG_API_RETRY).toBe(3);
        expect(result.NEXT_PUBLIC_ENABLE_MSW).toBe(false);
        expect(result.NEXT_PUBLIC_USER_SEQ).toBeNull();
      } finally {
        if (originalWindow) {
          (global as { window?: unknown }).window = originalWindow;
        } else {
          delete (global as { window?: unknown }).window;
        }
      }
    });
  });

  describe("서버 사이드 - 개발 환경", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      delete (global as { window?: unknown }).window;
    });

    it("should use default values when env vars are not set", async () => {
      delete process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL;
      delete process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL;

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_REVIEW_API_BASE_URL).toBe(
        "http://localhost:5000/api",
      );
      expect(result.NEXT_PUBLIC_CATALOG_API_BASE_URL).toBe(
        "http://localhost:4000/api",
      );
    });

    it("should use provided env vars when set", async () => {
      process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL = "http://custom:5000/api";
      process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL = "http://custom:4000/api";

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_REVIEW_API_BASE_URL).toBe(
        "http://custom:5000/api",
      );
      expect(result.NEXT_PUBLIC_CATALOG_API_BASE_URL).toBe(
        "http://custom:4000/api",
      );
    });

    it("should validate URL format", async () => {
      process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL = "invalid-url";

      const { validateEnv } = await import("../validation");
      await expect(async () => {
        try {
          validateEnv();
        } catch (e) {
          if (e instanceof Error && e.message.includes("process.exit")) {
            throw e;
          }
        }
      }).rejects.toThrow();
    });

    it("should parse NEXT_PUBLIC_ENABLE_MSW as boolean", async () => {
      process.env.NEXT_PUBLIC_ENABLE_MSW = "true";

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_ENABLE_MSW).toBe(true);
    });

    it("should parse NEXT_PUBLIC_USER_SEQ as number", async () => {
      process.env.NEXT_PUBLIC_USER_SEQ = "123";

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_USER_SEQ).toBe(123);
    });

    it("should handle missing NEXT_PUBLIC_USER_SEQ", async () => {
      delete process.env.NEXT_PUBLIC_USER_SEQ;

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_USER_SEQ).toBeNull();
    });
  });

  describe("서버 사이드 - 테스트 환경", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "test";
      delete (global as { window?: unknown }).window;
    });

    it("should use default values when env vars are not set", async () => {
      delete process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL;
      delete process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL;

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_REVIEW_API_BASE_URL).toBe(
        "http://localhost:5000/api",
      );
      expect(result.NEXT_PUBLIC_CATALOG_API_BASE_URL).toBe(
        "http://localhost:4000/api",
      );
    });
  });

  describe("서버 사이드 - 프로덕션 환경", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "production";
      delete (global as { window?: unknown }).window;
    });

    it("should require NEXT_PUBLIC_REVIEW_API_BASE_URL", async () => {
      delete process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL;
      delete process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL;

      const { validateEnv } = await import("../validation");
      await expect(async () => {
        try {
          validateEnv();
        } catch (e) {
          if (e instanceof Error && e.message.includes("process.exit")) {
            throw e;
          }
        }
      }).rejects.toThrow();
    });

    it("should require NEXT_PUBLIC_CATALOG_API_BASE_URL", async () => {
      process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL =
        "https://api.example.com/api";
      delete process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL;

      const { validateEnv } = await import("../validation");
      await expect(async () => {
        try {
          validateEnv();
        } catch (e) {
          if (e instanceof Error && e.message.includes("process.exit")) {
            throw e;
          }
        }
      }).rejects.toThrow();
    });

    it("should pass validation when all required vars are set", async () => {
      process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL =
        "https://api.example.com/api";
      process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL =
        "https://api.example.com/api";

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_REVIEW_API_BASE_URL).toBe(
        "https://api.example.com/api",
      );
      expect(result.NEXT_PUBLIC_CATALOG_API_BASE_URL).toBe(
        "https://api.example.com/api",
      );
    });

    it("should validate URL format in production", async () => {
      process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL = "invalid-url";
      process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL =
        "https://api.example.com/api";

      const { validateEnv } = await import("../validation");
      await expect(async () => {
        try {
          validateEnv();
        } catch (e) {
          if (e instanceof Error && e.message.includes("process.exit")) {
            throw e;
          }
        }
      }).rejects.toThrow();
    });
  });

  describe("캐싱", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      delete (global as { window?: unknown }).window;
    });

    it("should cache validated result", async () => {
      process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL = "http://first:5000/api";
      process.env.NEXT_PUBLIC_CATALOG_API_BASE_URL = "http://first:4000/api";

      const { validateEnv } = await import("../validation");
      const result1 = validateEnv();

      // 환경 변수 변경
      process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL = "http://second:5000/api";

      const result2 = validateEnv();

      // 캐싱되어 첫 번째 결과와 동일해야 함
      expect(result1).toBe(result2);
      expect(result1.NEXT_PUBLIC_REVIEW_API_BASE_URL).toBe(
        "http://first:5000/api",
      );
    });
  });

  describe("선택적 환경 변수", () => {
    beforeEach(() => {
      (process.env as { NODE_ENV?: string }).NODE_ENV = "development";
      delete (global as { window?: unknown }).window;
    });

    it("should handle missing NEXT_PUBLIC_APP_NAME", async () => {
      delete process.env.NEXT_PUBLIC_APP_NAME;

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_APP_NAME).toBeUndefined();
    });

    it("should handle missing NEXT_PUBLIC_APP_VERSION", async () => {
      delete process.env.NEXT_PUBLIC_APP_VERSION;

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_APP_VERSION).toBeUndefined();
    });

    it("should use provided NEXT_PUBLIC_APP_NAME", async () => {
      process.env.NEXT_PUBLIC_APP_NAME = "MyApp";

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_APP_NAME).toBe("MyApp");
    });

    it("should use default timeout values when not set", async () => {
      delete process.env.NEXT_PUBLIC_REVIEW_API_TIMEOUT;
      delete process.env.NEXT_PUBLIC_CATALOG_API_TIMEOUT;

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_REVIEW_API_TIMEOUT).toBe(10000);
      expect(result.NEXT_PUBLIC_CATALOG_API_TIMEOUT).toBe(10000);
    });

    it("should parse timeout values from environment", async () => {
      process.env.NEXT_PUBLIC_REVIEW_API_TIMEOUT = "5000";
      process.env.NEXT_PUBLIC_CATALOG_API_TIMEOUT = "15000";

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_REVIEW_API_TIMEOUT).toBe(5000);
      expect(result.NEXT_PUBLIC_CATALOG_API_TIMEOUT).toBe(15000);
    });

    it("should use default retry values when not set", async () => {
      delete process.env.NEXT_PUBLIC_REVIEW_API_RETRY;
      delete process.env.NEXT_PUBLIC_CATALOG_API_RETRY;

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_REVIEW_API_RETRY).toBe(3);
      expect(result.NEXT_PUBLIC_CATALOG_API_RETRY).toBe(3);
    });

    it("should parse retry values from environment", async () => {
      process.env.NEXT_PUBLIC_REVIEW_API_RETRY = "5";
      process.env.NEXT_PUBLIC_CATALOG_API_RETRY = "2";

      const { validateEnv } = await import("../validation");
      const result = validateEnv();

      expect(result.NEXT_PUBLIC_REVIEW_API_RETRY).toBe(5);
      expect(result.NEXT_PUBLIC_CATALOG_API_RETRY).toBe(2);
    });
  });
});
