import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { CatalogErrorCode } from "../common/error/catalog-error-code.js";

type MessageParams = Record<string, string | number | boolean>;

/**
 * 메시지 서비스
 *
 * 에러 코드를 메시지 리소스로 변환합니다.
 * 향후 NestJS i18n으로 전환 가능한 구조입니다.
 */
@Injectable()
export class MessageService {
  private readonly messages: Map<string, string>;

  constructor() {
    // 현재는 한국어만 지원
    // 향후 locale별 로딩 가능
    // 빌드 후 경로 대응: src/i18n 또는 dist/i18n
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const messagesPath = join(__dirname, "messages.ko.json");
    const messagesKo = JSON.parse(
      readFileSync(messagesPath, "utf-8"),
    ) as Record<string, string>;

    this.messages = new Map(Object.entries(messagesKo));
  }

  /**
   * 에러 코드로 메시지 조회
   * @param code 에러 코드 (CatalogErrorCode enum 또는 문자열)
   * @param params 파라미터 치환 값
   * @returns 포맷된 메시지 (없으면 코드 반환)
   */
  get(code: CatalogErrorCode | string, params?: MessageParams): string {
    const template = this.messages.get(code) ?? code;

    if (!params) return template;

    return template.replace(/\{(\w+)}/g, (_, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : `{${key}}`;
    });
  }
}
