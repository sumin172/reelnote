import { Inject, Injectable, Logger } from "@nestjs/common";
import { SearchQuery, SearchReadPort } from "./application/search-read.port.js";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(SearchReadPort) private readonly searchReadPort: SearchReadPort,
  ) {}

  /**
   * 영화 검색
   * 1. 로컬 DB에서 검색 시도
   * 2. 필요 시 TMDB 검색 결과도 포함
   */
  async search(query: string, page = 1, language = "ko-KR") {
    this.logger.log(`영화 검색: query=${query}, page=${page}`);
    const searchQuery: SearchQuery = { query, page, language };
    return this.searchReadPort.search(searchQuery);
  }
}
