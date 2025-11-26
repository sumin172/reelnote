import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, ApiError } from "../client";
import { CommonErrorCode } from "@/lib/errors/error-codes";

// fetch 모킹
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("apiFetch", () => {
  const baseUrl = "http://localhost:8080/api";

  beforeEach(() => {
    mockFetch.mockClear();
    // Node.js 환경임을 보장 (window가 없어야 MSW가 비활성화됨)
    delete (global as { window?: unknown }).window;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("성공 응답 처리", () => {
    it("should return JSON response data", async () => {
      const mockData = { id: 1, name: "Test" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => mockData,
      } as Response);

      const result = await apiFetch<typeof mockData>("/v1/test", {
        baseUrl,
      });

      expect(result).toEqual(mockData);
      // Node.js 환경에서는 MSW가 비활성화되어 baseUrl이 그대로 사용됨
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe(`${baseUrl}/v1/test`);
      const headers = callArgs[1]?.headers as HeadersInit;
      if (headers instanceof Headers) {
        expect(headers.get("content-type")).toBe("application/json");
      } else if (headers && typeof headers === "object") {
        const headerObj = headers as Record<string, string>;
        expect(headerObj["content-type"] || headerObj["Content-Type"]).toBe(
          "application/json",
        );
      }
    });

    it("should handle 204 No Content responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ "Content-Length": "0" }),
      } as Response);

      const result = await apiFetch<void>("/v1/test/1", {
        method: "DELETE",
        baseUrl,
      });

      expect(result).toBeUndefined();
    });

    it("should handle non-JSON responses", async () => {
      const textData = "plain text response";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "text/plain" }),
        text: async () => textData,
      } as Response);

      const result = await apiFetch<string>("/v1/test", { baseUrl });

      expect(result).toBe(textData);
    });
  });

  describe("TraceId 처리 (백엔드 관리)", () => {
    it("should not send X-Trace-Id header (백엔드가 생성/관리)", async () => {
      let capturedHeaders: unknown = null;

      mockFetch.mockImplementationOnce((_url, options) => {
        const headers = options?.headers as HeadersInit;
        if (headers instanceof Headers) {
          capturedHeaders = headers;
        } else if (headers && typeof headers === "object") {
          capturedHeaders = headers as Record<string, string>;
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: async () => ({ success: true }),
        } as Response);
      });

      await apiFetch("/v1/test", { baseUrl });

      // X-Trace-Id 헤더를 보내지 않음 (백엔드가 생성/관리)
      if (capturedHeaders !== null) {
        if (capturedHeaders instanceof Headers) {
          expect(capturedHeaders.get("X-Trace-Id")).toBeNull();
          expect(capturedHeaders.get("x-trace-id")).toBeNull();
        } else {
          const headerObj = capturedHeaders as Record<string, string>;
          expect(headerObj["X-Trace-Id"]).toBeUndefined();
          expect(headerObj["x-trace-id"]).toBeUndefined();
        }
      }
    });

    it("should use traceId from error response (백엔드가 생성)", async () => {
      const responseTraceId = "response-trace-id";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => ({
          code: CommonErrorCode.INTERNAL_ERROR,
          message: "Server error",
          traceId: responseTraceId, // 백엔드가 생성한 traceId
        }),
      } as Response);

      try {
        await apiFetch("/v1/test", { baseUrl });
        expect.fail("Should have thrown ApiError");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          // 응답에서 traceId를 읽어옴
          expect(error.traceId).toBe(responseTraceId);
        }
      }
    });

    it("should use traceId from response header if available", async () => {
      const responseTraceId = "response-trace-id-header";

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({
          "Content-Type": "application/json",
          "X-Trace-Id": responseTraceId,
        }),
        json: async () => ({
          code: CommonErrorCode.INTERNAL_ERROR,
          message: "Server error",
          // traceId 없음 (헤더에서 가져옴)
        }),
      } as Response);

      try {
        await apiFetch("/v1/test", { baseUrl });
        expect.fail("Should have thrown ApiError");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          // 응답 헤더에서 traceId를 읽어옴
          expect(error.traceId).toBe(responseTraceId);
        }
      }
    });
  });

  describe("ActionId 처리", () => {
    it("should include X-Action-Id header when provided", async () => {
      const actionId = "test-action-id";
      let capturedActionId: string | null = null;

      mockFetch.mockImplementationOnce((_url, options) => {
        const headers = options?.headers as HeadersInit;
        if (headers instanceof Headers) {
          capturedActionId = headers.get("X-Action-Id");
        } else if (headers && typeof headers === "object") {
          const headerObj = headers as Record<string, string>;
          capturedActionId =
            headerObj["X-Action-Id"] || headerObj["x-action-id"];
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: async () => ({ success: true }),
        } as Response);
      });

      await apiFetch("/v1/test", { baseUrl, actionId });

      expect(capturedActionId).toBe(actionId);
    });

    it("should not include X-Action-Id header when not provided", async () => {
      let capturedActionId: string | null | undefined = null;

      mockFetch.mockImplementationOnce((_url, options) => {
        const headers = options?.headers as HeadersInit;
        if (headers instanceof Headers) {
          capturedActionId = headers.get("X-Action-Id");
        } else if (headers && typeof headers === "object") {
          const headerObj = headers as Record<string, string>;
          capturedActionId =
            headerObj["X-Action-Id"] || headerObj["x-action-id"];
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: async () => ({ success: true }),
        } as Response);
      });

      await apiFetch("/v1/test", { baseUrl });

      // Headers 객체에서 없는 헤더는 null을 반환하지만,
      // Record 객체에서는 undefined일 수 있음
      expect(capturedActionId).toBeFalsy(); // null 또는 undefined
    });
  });

  describe("헤더 처리", () => {
    it("should include Content-Type header", async () => {
      let capturedHeaders: unknown = null;

      mockFetch.mockImplementationOnce((_url, options) => {
        const headers = options?.headers as HeadersInit;
        if (headers instanceof Headers) {
          capturedHeaders = headers;
        } else if (headers && typeof headers === "object") {
          capturedHeaders = headers as Record<string, string>;
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: async () => ({ success: true }),
        } as Response);
      });

      await apiFetch("/v1/test", { baseUrl });

      if (capturedHeaders !== null) {
        if (capturedHeaders instanceof Headers) {
          expect(capturedHeaders.get("content-type")).toBe("application/json");
        } else {
          const headerObj = capturedHeaders as Record<string, string>;
          expect(headerObj["content-type"] || headerObj["Content-Type"]).toBe(
            "application/json",
          );
        }
      }
    });

    it("should merge custom headers", async () => {
      let capturedHeaders: unknown = null;

      mockFetch.mockImplementationOnce((_url, options) => {
        const headers = options?.headers as HeadersInit;
        if (headers instanceof Headers) {
          capturedHeaders = headers;
        } else if (headers && typeof headers === "object") {
          capturedHeaders = headers as Record<string, string>;
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: async () => ({ success: true }),
        } as Response);
      });

      await apiFetch("/v1/test", {
        baseUrl,
        headers: { "X-Custom-Header": "custom-value" },
      });

      if (capturedHeaders !== null) {
        if (capturedHeaders instanceof Headers) {
          expect(capturedHeaders.get("x-custom-header")).toBe("custom-value");
          expect(capturedHeaders.get("content-type")).toBe("application/json");
        } else {
          const headerObj = capturedHeaders as Record<string, string>;
          expect(
            headerObj["X-Custom-Header"] || headerObj["x-custom-header"],
          ).toBe("custom-value");
          expect(headerObj["content-type"] || headerObj["Content-Type"]).toBe(
            "application/json",
          );
        }
      }
    });

    it("should allow user to override default headers", async () => {
      let capturedHeaders: unknown = null;

      mockFetch.mockImplementationOnce((_url, options) => {
        const headers = options?.headers as HeadersInit;
        if (headers instanceof Headers) {
          capturedHeaders = headers;
        } else if (headers && typeof headers === "object") {
          capturedHeaders = headers as Record<string, string>;
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: async () => ({ success: true }),
        } as Response);
      });

      await apiFetch("/v1/test", {
        baseUrl,
        headers: { "Content-Type": "application/xml" }, // 사용자가 override
      });

      if (capturedHeaders !== null) {
        if (capturedHeaders instanceof Headers) {
          expect(capturedHeaders.get("content-type")).toBe("application/xml");
        } else {
          const headerObj = capturedHeaders as Record<string, string>;
          expect(headerObj["content-type"] || headerObj["Content-Type"]).toBe(
            "application/xml",
          );
        }
      }
    });
  });

  describe("에러 응답 처리", () => {
    it("should throw ApiError with normalized code for known error codes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => ({
          code: CommonErrorCode.VALIDATION_ERROR,
          message: "Validation failed",
          details: { field: "email" },
          traceId: "test-trace-id",
        }),
      } as Response);

      try {
        await apiFetch("/v1/test", { baseUrl });
        expect.fail("Should have thrown ApiError");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.code).toBe(CommonErrorCode.VALIDATION_ERROR);
          expect(error.status).toBe(400);
          expect(error.message).toBe("Validation failed");
          expect(error.details).toEqual({ field: "email" });
          expect(error.traceId).toBe("test-trace-id");
        }
      }
    });

    it("should throw ApiError with UNKNOWN_ERROR for unknown error codes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => ({
          code: "UNKNOWN_ERROR_CODE",
          message: "Some error",
        }),
      } as Response);

      try {
        await apiFetch("/v1/test", { baseUrl });
        expect.fail("Should have thrown ApiError");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.code).toBe("UNKNOWN_ERROR");
          expect(error.status).toBe(500);
          expect(error.message).toBe("Some error");
        }
      }
    });

    it("should throw ApiError for non-standard error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => ({
          error: "Something went wrong",
        }),
      } as Response);

      try {
        await apiFetch("/v1/test", { baseUrl });
        expect.fail("Should have thrown ApiError");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.code).toBe("UNKNOWN_ERROR");
          expect(error.status).toBe(500);
        }
      }
    });

    it("should throw ApiError for non-JSON error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers({ "Content-Type": "text/plain" }),
        text: async () => "Internal Server Error",
      } as Response);

      try {
        await apiFetch("/v1/test", { baseUrl });
        expect.fail("Should have thrown ApiError");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.code).toBe("UNKNOWN_ERROR");
          expect(error.status).toBe(500);
          expect(error.message).toContain("Internal Server Error");
        }
      }
    });

    it("should handle empty error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
        text: async () => "",
      } as Response);

      try {
        await apiFetch("/v1/test", { baseUrl });
        expect.fail("Should have thrown ApiError");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.code).toBe("UNKNOWN_ERROR");
          expect(error.status).toBe(500);
        }
      }
    });
  });

  describe("요청 옵션", () => {
    it("should support custom HTTP methods", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => ({ received: { data: "test" } }),
      } as Response);

      const result = await apiFetch("/v1/test", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
        baseUrl,
      });

      expect(result).toEqual({ received: { data: "test" } });
      // Node.js 환경에서는 baseUrl이 그대로 사용됨
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/test`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ data: "test" }),
        }),
      );
    });

    it("should support custom baseUrl", async () => {
      const customBaseUrl = "https://custom-api.com/api";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: async () => ({ success: true }),
      } as Response);

      const result = await apiFetch("/v1/test", { baseUrl: customBaseUrl });

      expect(result).toEqual({ success: true });
      // Node.js 환경에서는 MSW가 비활성화되어 customBaseUrl이 그대로 사용됨
      expect(mockFetch).toHaveBeenCalledWith(
        `${customBaseUrl}/v1/test`,
        expect.any(Object),
      );
    });
  });
});

describe("ApiError", () => {
  describe("에러 코드 정규화", () => {
    it("should normalize known error codes", () => {
      const error = new ApiError(
        "Test error",
        400,
        CommonErrorCode.VALIDATION_ERROR,
      );

      expect(error.code).toBe(CommonErrorCode.VALIDATION_ERROR);
    });

    it("should normalize unknown error codes to UNKNOWN_ERROR", () => {
      const error = new ApiError("Test error", 500, "UNKNOWN_CODE");

      expect(error.code).toBe("UNKNOWN_ERROR");
    });

    it("should handle UNKNOWN_ERROR code itself", () => {
      const error = new ApiError("Test error", 500, "UNKNOWN_ERROR");

      expect(error.code).toBe("UNKNOWN_ERROR");
    });
  });

  describe("타입 가드 메서드", () => {
    it("should check if error code matches", () => {
      const error = new ApiError(
        "Test error",
        400,
        CommonErrorCode.VALIDATION_ERROR,
      );

      expect(error.isCode(CommonErrorCode.VALIDATION_ERROR)).toBe(true);
      expect(error.isCode(CommonErrorCode.INTERNAL_ERROR)).toBe(false);
    });

    it("should check if error code is known", () => {
      const knownError = new ApiError(
        "Test error",
        400,
        CommonErrorCode.VALIDATION_ERROR,
      );
      const unknownError = new ApiError("Test error", 500, "UNKNOWN_CODE");

      expect(knownError.isKnownCode()).toBe(true);
      expect(unknownError.isKnownCode()).toBe(false);
    });
  });

  describe("에러 속성", () => {
    it("should store all error properties", () => {
      const details = { field: "email", reason: "invalid format" };
      const traceId = "test-trace-id";
      const error = new ApiError(
        "Test error",
        400,
        CommonErrorCode.VALIDATION_ERROR,
        details,
        traceId,
      );

      expect(error.message).toBe("Test error");
      expect(error.status).toBe(400);
      expect(error.code).toBe(CommonErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual(details);
      expect(error.traceId).toBe(traceId);
      expect(error.name).toBe("ApiError");
    });
  });
});
