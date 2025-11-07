import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CatalogCorePrismaService } from '../../../database/catalog-core/catalog-core.prisma.service';
import { MovieRepositoryPort } from '../../domain/ports/movie-repository.port';
import { Movie, MovieSnapshot } from '../../domain/movie';

type MovieWithRelations = Prisma.MovieGetPayload<{
  include: {
    genres: { include: { genre: true } };
    keywords: { include: { keyword: true } };
  };
}>;

@Injectable()
export class PrismaMovieRepository extends MovieRepositoryPort {
  constructor(private readonly prisma: CatalogCorePrismaService) {
    super();
  }

  async findByTmdbId(tmdbId: number): Promise<Movie | null> {
    const movie = await this.prisma.movie.findUnique({
      where: { tmdbId },
      include: {
        genres: { include: { genre: true } },
        keywords: { include: { keyword: true } },
      },
    });

    if (!movie) {
      return null;
    }

    return Movie.hydrate(this.toSnapshot(movie));
  }

  async save(movie: Movie): Promise<Movie> {
    const snapshot = movie.toSnapshot();

    await this.prisma.movie.upsert({
      where: { tmdbId: snapshot.tmdbId },
      update: this.toPersistence(snapshot),
      create: this.toPersistence(snapshot),
    });

    await this.syncGenres(snapshot.tmdbId, snapshot.genres);
    await this.syncKeywords(snapshot.tmdbId, snapshot.keywords);

    const reloaded = await this.findByTmdbId(snapshot.tmdbId);
    return reloaded ?? Movie.hydrate(snapshot);
  }

  private toPersistence(snapshot: MovieSnapshot): Prisma.MovieUncheckedCreateInput {
    return {
      tmdbId: snapshot.tmdbId,
      title: snapshot.title,
      originalTitle: snapshot.originalTitle,
      year: snapshot.year ?? null,
      runtime: snapshot.runtime ?? null,
      language: snapshot.language ?? null,
      country: snapshot.country ?? null,
      posterPath: snapshot.posterPath ?? null,
      popularity: snapshot.popularity ?? null,
      voteAvg: snapshot.voteAvg ?? null,
      voteCnt: snapshot.voteCnt ?? null,
      syncedAt: snapshot.syncedAt,
      rawJson: (snapshot.rawPayload ?? {}) as Prisma.InputJsonValue,
    };
  }

  private toSnapshot(movie: MovieWithRelations): MovieSnapshot {
    return {
      tmdbId: movie.tmdbId,
      title: movie.title,
      originalTitle: movie.originalTitle,
      year: movie.year ?? undefined,
      runtime: movie.runtime ?? undefined,
      language: movie.language ?? undefined,
      country: movie.country ?? undefined,
      posterPath: movie.posterPath ?? undefined,
      popularity: movie.popularity ?? undefined,
      voteAvg: movie.voteAvg ?? undefined,
      voteCnt: movie.voteCnt ?? undefined,
      syncedAt: movie.syncedAt,
      genres: movie.genres?.map(g => g.genre.name) ?? [],
      keywords: movie.keywords?.map(k => k.keyword.name) ?? [],
      rawPayload: movie.rawJson,
    };
  }

  private async syncGenres(tmdbId: number, genres: string[]): Promise<void> {
    await this.prisma.movieGenre.deleteMany({ where: { tmdbId } });

    for (const name of genres) {
      const genre = await this.prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name },
      });

      await this.prisma.movieGenre.create({
        data: {
          tmdbId,
          genreId: genre.id,
        },
      });
    }
  }

  private async syncKeywords(tmdbId: number, keywords: string[]): Promise<void> {
    await this.prisma.movieKeyword.deleteMany({ where: { tmdbId } });

    for (const name of keywords) {
      const keyword = await this.prisma.keyword.upsert({
        where: { name },
        update: {},
        create: { name },
      });

      await this.prisma.movieKeyword.create({
        data: {
          tmdbId,
          keywordId: keyword.id,
        },
      });
    }
  }
}


