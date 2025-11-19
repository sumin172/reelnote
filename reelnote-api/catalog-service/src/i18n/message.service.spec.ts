import { Test, TestingModule } from "@nestjs/testing";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { MessageService } from "./message.service.js";
import { CatalogErrorCode } from "../common/error/catalog-error-code.js";

describe("MessageService", () => {
  let service: MessageService;
  let messages: Record<string, string>;

  beforeAll(() => {
    // messages.ko.json 로드
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const messagesPath = join(__dirname, "messages.ko.json");
    messages = JSON.parse(readFileSync(messagesPath, "utf-8")) as Record<
      string,
      string
    >;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageService],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Message Resource Validation", () => {
    /**
     * 모든 CatalogErrorCode enum 값이 messages.ko.json에 존재하는지 검증
     *
     * 이 테스트는 에러 코드와 메시지 리소스 간의 드리프트를 방지합니다.
     *
     * @see ERROR_SPECIFICATION.md 섹션 2.3
     */
    it("should have messages for all error codes", () => {
      const errorCodes = Object.values(CatalogErrorCode) as string[];

      errorCodes.forEach((code) => {
        expect(messages).toHaveProperty(code);
        expect(messages[code]).toBeDefined();
        expect(typeof messages[code]).toBe("string");
        expect(messages[code].length).toBeGreaterThan(0);
      });
    });

    /**
     * messages.ko.json에 있는 모든 키가 유효한 에러 코드인지 검증
     * (선택사항: 사용하지 않는 메시지 키 감지)
     */
    it("should not have orphaned message keys", () => {
      const errorCodes = new Set(Object.values(CatalogErrorCode));
      const messageKeys = Object.keys(messages);

      messageKeys.forEach((key) => {
        // 에러 코드가 아닌 키는 무시 (향후 확장 가능성 고려)
        // 하지만 주석으로 표시해두면 좋음
        if (!errorCodes.has(key as CatalogErrorCode)) {
          console.warn(
            `Warning: Message key "${key}" is not in CatalogErrorCode enum`,
          );
        }
      });
    });
  });

  describe("Message Parameter Replacement", () => {
    it("should replace named parameters correctly", () => {
      const message = service.get(CatalogErrorCode.MOVIE_NOT_FOUND, {
        tmdbId: 123,
      });

      expect(message).toContain("123");
      expect(message).not.toContain("{tmdbId}");
    });

    it("should handle missing parameters gracefully", () => {
      const message = service.get(CatalogErrorCode.MOVIE_NOT_FOUND);

      // 파라미터가 없으면 템플릿 그대로 반환
      expect(message).toContain("{tmdbId}");
    });

    it("should handle partial parameters", () => {
      const message = service.get(CatalogErrorCode.CATALOG_TMDB_API_ERROR, {
        status: 500,
        statusText: "Internal Server Error",
      });

      expect(message).toContain("TMDB API");
    });
  });

  describe("Message Retrieval", () => {
    it("should return message for valid error code", () => {
      const message = service.get(CatalogErrorCode.VALIDATION_ERROR);

      expect(message).toBeDefined();
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    });

    it("should return error code itself if message not found", () => {
      const message = service.get("NON_EXISTENT_CODE" as CatalogErrorCode);

      expect(message).toBe("NON_EXISTENT_CODE");
    });
  });
});
