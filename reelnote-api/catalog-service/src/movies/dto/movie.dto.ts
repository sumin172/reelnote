import { IsNumber, IsString, IsOptional, IsArray, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MovieResponseDto {
  @ApiProperty({ description: 'TMDB 영화 ID' })
  @IsNumber()
  tmdbId!: number;

  @ApiProperty({ description: '영화 제목' })
  @IsString()
  title!: string;

  @ApiProperty({ description: '원본 제목' })
  @IsString()
  originalTitle!: string;

  @ApiPropertyOptional({ description: '개봉 연도' })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: '상영 시간 (분)' })
  @IsOptional()
  @IsNumber()
  runtime?: number;

  @ApiPropertyOptional({ description: '언어' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: '국가' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: '포스터 경로' })
  @IsOptional()
  @IsString()
  posterPath?: string;

  @ApiPropertyOptional({ description: '인기도 점수' })
  @IsOptional()
  popularity?: number;

  @ApiPropertyOptional({ description: '평균 평점' })
  @IsOptional()
  voteAvg?: number;

  @ApiPropertyOptional({ description: '평점 개수' })
  @IsOptional()
  @IsNumber()
  voteCnt?: number;

  @ApiPropertyOptional({ description: '마지막 동기화 시간' })
  @IsOptional()
  @IsDate()
  syncedAt?: Date;

  @ApiPropertyOptional({ description: '장르 목록', type: [String] })
  @IsOptional()
  @IsArray()
  genres?: string[];

  @ApiPropertyOptional({ description: '키워드 목록', type: [String] })
  @IsOptional()
  @IsArray()
  keywords?: string[];
}

export class ImportMoviesDto {
  @ApiProperty({ description: '가져올 TMDB 영화 ID 목록', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  tmdbIds!: number[];
}

