import { Injectable } from "@nestjs/common";
import { CatalogPrismaAccessor } from "../../infrastructure/db/catalog-prisma.accessor.js";
import { SearchMovieResult } from "../application/search-read.port.js";

const SEARCH_PAGE_SIZE = 20;

@Injectable()
export class SearchLocalReadAdapter {
  constructor(private readonly catalogPrisma: CatalogPrismaAccessor) {}

  async search(query: string, page: number): Promise<SearchMovieResult[]> {
    const results = await this.catalogPrisma.movie.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { originalTitle: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        tmdbId: true,
        title: true,
        originalTitle: true,
        posterPath: true,
        year: true,
      },
      take: SEARCH_PAGE_SIZE,
      skip: (page - 1) * SEARCH_PAGE_SIZE,
    });

    return results
      .filter(
        (movie): movie is typeof movie & { tmdbId: number } =>
          movie.tmdbId !== null,
      )
      .map((movie) => ({
        tmdbId: movie.tmdbId,
        title: movie.title ?? "제목 미상",
        originalTitle: movie.originalTitle,
        posterPath: movie.posterPath,
        year: movie.year,
        source: "local",
      }));
  }
}
