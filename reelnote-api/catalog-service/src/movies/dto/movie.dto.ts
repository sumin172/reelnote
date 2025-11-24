import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ImportMoviesJobStatus } from "../application/jobs/import-movies.job-service.js";

export class MovieResponseDto {
  @ApiProperty({ description: "TMDB 영화 ID", type: Number })
  @IsNumber()
  tmdbId!: number;

  @ApiProperty({ description: "영화 제목", type: String })
  @IsString()
  title!: string;

  @ApiProperty({ description: "원본 제목", type: String })
  @IsString()
  originalTitle!: string;

  @ApiPropertyOptional({ description: "개봉 연도", type: Number })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: "상영 시간 (분)", type: Number })
  @IsOptional()
  @IsNumber()
  runtime?: number;

  @ApiPropertyOptional({ description: "언어", type: String })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: "국가", type: String })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: "포스터 경로", type: String })
  @IsOptional()
  @IsString()
  posterPath?: string;

  @ApiPropertyOptional({ description: "인기도 점수", type: Number })
  @IsOptional()
  popularity?: number;

  @ApiPropertyOptional({ description: "평균 평점", type: Number })
  @IsOptional()
  voteAvg?: number;

  @ApiPropertyOptional({ description: "평점 개수", type: Number })
  @IsOptional()
  @IsNumber()
  voteCnt?: number;

  @ApiPropertyOptional({ description: "마지막 동기화 시간", type: Date })
  @IsOptional()
  @IsDate()
  syncedAt?: Date;

  @ApiPropertyOptional({ description: "장르 목록", type: [String] })
  @IsOptional()
  @IsArray()
  genres?: string[];

  @ApiPropertyOptional({ description: "키워드 목록", type: [String] })
  @IsOptional()
  @IsArray()
  keywords?: string[];
}

export class ImportMoviesDto {
  @ApiProperty({ description: "가져올 TMDB 영화 ID 목록", type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tmdbIds?: number[];

  @ApiPropertyOptional({ description: "언어 코드 (기본: ko-KR)", type: String })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: "재시도할 기존 작업 ID", type: String })
  @IsOptional()
  @IsUUID()
  resumeJobId?: string;
}

export class ImportMoviesFailureDto {
  @ApiProperty({ description: "실패한 TMDB 영화 ID", type: Number })
  @IsNumber()
  tmdbId!: number;

  @ApiProperty({ description: "실패 사유", type: String })
  @IsString()
  reason!: string;
}

export class ImportMoviesImmediateResponseDto {
  @ApiProperty({
    description: "성공적으로 인입된 영화 목록",
    type: () => [MovieResponseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovieResponseDto)
  movies!: MovieResponseDto[];

  @ApiProperty({
    description: "실패한 영화 목록",
    type: () => [ImportMoviesFailureDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMoviesFailureDto)
  failures!: ImportMoviesFailureDto[];
}

export class ImportMoviesJobSummaryDto {
  @ApiProperty({ description: "작업 ID", type: String })
  @IsUUID()
  jobId!: string;

  @ApiProperty({ description: "작업 상태", enum: ImportMoviesJobStatus })
  @IsEnum(ImportMoviesJobStatus)
  status!: ImportMoviesJobStatus;

  @ApiProperty({ description: "총 처리 대상 수", type: Number })
  @IsNumber()
  total!: number;

  @ApiProperty({ description: "현재까지 처리된 수", type: Number })
  @IsNumber()
  processed!: number;

  @ApiProperty({ description: "성공한 수", type: Number })
  @IsNumber()
  succeeded!: number;

  @ApiProperty({ description: "실패한 수", type: Number })
  @IsNumber()
  failed!: number;

  @ApiProperty({ description: "요청 시각", type: Date })
  @IsDate()
  requestedAt!: Date;

  @ApiPropertyOptional({ description: "완료 시각", type: Date })
  @IsOptional()
  @IsDate()
  completedAt?: Date;
}

export class ImportMoviesJobDetailDto extends ImportMoviesJobSummaryDto {
  @ApiPropertyOptional({
    description: "완료된 경우 성공한 영화 목록",
    type: () => [MovieResponseDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovieResponseDto)
  movies?: MovieResponseDto[];

  @ApiProperty({
    description: "실패한 영화 정보",
    type: () => [ImportMoviesFailureDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMoviesFailureDto)
  failures!: ImportMoviesFailureDto[];

  @ApiPropertyOptional({
    description: "작업 실패 시 에러 메시지",
    type: String,
  })
  @IsOptional()
  @IsString()
  error?: string;
}
