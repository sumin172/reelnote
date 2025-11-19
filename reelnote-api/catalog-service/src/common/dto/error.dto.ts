import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 표준 에러 응답 스키마
 * HTTP status code와 함께 사용되며, 성공 응답에는 사용되지 않습니다.
 * ERROR_SPECIFICATION.md와 일치해야 함
 */
export class ErrorDetailDto {
  @ApiProperty({
    description: "에러 코드 (머신/사람이 같이 읽기 좋은 짧은 코드)",
    example: "VALIDATION_ERROR",
  })
  code!: string;

  @ApiProperty({
    description: "사람 친화적 에러 메시지",
    example: "입력 데이터 검증에 실패했습니다",
  })
  message!: string;

  @ApiPropertyOptional({
    description: "추가 상세 정보 (필드별 에러, 컨텍스트 등)",
    example: {
      path: "/api/v1/movies/123",
      fieldErrors: {
        rating: "평점은 1-5 사이여야 합니다.",
      },
    },
  })
  details?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "분산 트레이싱 / 로그 상관관계용 추적 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  traceId?: string;
}
