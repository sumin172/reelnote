import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MoviesFacade } from './application/movies.facade';
import { MovieResponseDto, ImportMoviesDto } from './dto/movie.dto';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesFacade: MoviesFacade) {}

  @Get(':tmdbId')
  @ApiOperation({ summary: '영화 상세 조회', description: 'TMDB ID로 영화 상세 정보를 조회합니다. 로컬 캐시 미스 시 TMDB에서 가져와 저장합니다.' })
  @ApiParam({ name: 'tmdbId', description: 'TMDB 영화 ID', type: Number })
  @ApiQuery({ name: 'language', required: false, description: '언어 코드 (기본: ko-KR)' })
  @ApiResponse({ status: 200, description: '영화 정보 조회 성공', type: MovieResponseDto })
  @ApiResponse({ status: 404, description: '영화를 찾을 수 없음' })
  async getMovie(
    @Param('tmdbId') tmdbId: number,
    @Query('language') language: string = 'ko-KR',
  ): Promise<MovieResponseDto> {
    return this.moviesFacade.getMovie(tmdbId, language);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '영화 일괄 인입', description: '여러 영화를 TMDB에서 가져와 저장/업데이트합니다.' })
  @ApiResponse({ status: 200, description: '영화 인입 성공', type: [MovieResponseDto] })
  async importMovies(@Body() dto: ImportMoviesDto): Promise<MovieResponseDto[]> {
    return this.moviesFacade.importMovies(dto.tmdbIds);
  }
}

