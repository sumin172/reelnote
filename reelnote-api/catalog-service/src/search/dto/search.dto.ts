import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SearchMovieResultDto {
  @ApiProperty({ description: "TMDB 영화 ID", type: Number })
  @IsNumber()
  tmdbId!: number;

  @ApiProperty({ description: "영화 제목", type: String })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: "원본 제목", type: String })
  @IsOptional()
  @IsString()
  originalTitle?: string | null;

  @ApiPropertyOptional({ description: "포스터 경로", type: String })
  @IsOptional()
  @IsString()
  posterPath?: string | null;

  @ApiPropertyOptional({ description: "개봉 연도", type: Number })
  @IsOptional()
  @IsNumber()
  year?: number | null;

  @ApiProperty({
    description: "데이터 소스",
    enum: ["local", "tmdb"],
    type: String,
  })
  @IsString()
  source!: "local" | "tmdb";
}

export class SearchResultDto {
  @ApiProperty({ description: "검색어", type: String })
  @IsString()
  query!: string;

  @ApiProperty({ description: "페이지 번호", type: Number })
  @IsNumber()
  page!: number;

  @ApiProperty({
    description: "로컬 DB 검색 결과",
    type: () => [SearchMovieResultDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SearchMovieResultDto)
  local!: SearchMovieResultDto[];

  @ApiProperty({
    description: "TMDB 검색 결과",
    type: () => [SearchMovieResultDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SearchMovieResultDto)
  tmdb!: SearchMovieResultDto[];
}
