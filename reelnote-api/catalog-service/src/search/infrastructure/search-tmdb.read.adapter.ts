import { Injectable, Logger } from "@nestjs/common";
import { TmdbService } from "../../tmdb/tmdb.service.js";
import { SearchMovieResult } from "../application/search-read.port.js";

type TmdbSearchMovie = {
  id?: number;
  title?: string | null;
  original_title?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
};

type TmdbSearchMoviesResponse = {
  results?: TmdbSearchMovie[];
};

@Injectable()
export class SearchTmdbReadAdapter {
  private readonly logger = new Logger(SearchTmdbReadAdapter.name);

  constructor(private readonly tmdbService: TmdbService) {}

  async search(
    query: string,
    page: number,
    language: string,
  ): Promise<SearchMovieResult[]> {
    try {
      const response = (await this.tmdbService.searchMovies(
        query,
        page,
        language,
      )) as TmdbSearchMoviesResponse;
      const results = Array.isArray(response?.results) ? response.results : [];

      return results
        .filter(
          (movie): movie is TmdbSearchMovie & { id: number } =>
            typeof movie?.id === "number",
        )
        .map((movie) => ({
          tmdbId: movie.id,
          title: movie.title ?? "제목 미상",
          originalTitle: movie.original_title ?? null,
          posterPath: movie.poster_path ?? null,
          year: movie.release_date
            ? new Date(movie.release_date).getFullYear()
            : null,
          source: "tmdb",
        }));
    } catch (error) {
      this.logger.warn(
        `TMDB 검색 실패 (query=${query}, page=${page})`,
        error as Error,
      );
      return [];
    }
  }
}
