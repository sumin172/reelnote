import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { SearchService } from "./search.service.js";
import { SearchResultDto } from "./dto/search.dto.js";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: "영화 검색",
    description: "제목 또는 키워드로 영화를 검색합니다.",
  })
  @ApiQuery({ name: "q", required: true, description: "검색어" })
  @ApiQuery({
    name: "page",
    required: false,
    description: "페이지 번호 (기본: 1)",
  })
  @ApiQuery({
    name: "language",
    required: false,
    description: "언어 코드 (기본: ko-KR)",
  })
  @ApiResponse({
    status: 200,
    description: "검색 성공",
    type: () => SearchResultDto,
  })
  async search(
    @Query("q") query: string,
    @Query("page") page = 1,
    @Query("language") language = "ko-KR",
  ): Promise<SearchResultDto> {
    return this.searchService.search(query, page, language);
  }
}
