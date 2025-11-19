import { Global, Module } from "@nestjs/common";
import { MessageService } from "./message.service.js";
import { ExceptionFactoryService } from "../common/error/exception-factory.service.js";

/**
 * 메시지 모듈
 *
 * 글로벌 모듈로 등록하여 어디서든 MessageService와 ExceptionFactoryService를 사용할 수 있습니다.
 */
@Global()
@Module({
  providers: [MessageService, ExceptionFactoryService],
  exports: [MessageService, ExceptionFactoryService],
})
export class MessageModule {}
