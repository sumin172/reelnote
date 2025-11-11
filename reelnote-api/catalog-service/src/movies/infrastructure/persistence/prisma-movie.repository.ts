import {Injectable} from '@nestjs/common';
import {CatalogPrismaAccessor, CatalogPrismaTransaction,} from '../../../infrastructure/db/catalog-prisma.accessor';
import {
  MovieRepositoryPort,
  SaveManyOptions,
  SaveOptions,
  SaveStrategy
} from '../../domain/ports/movie-repository.port';
import {Movie, MovieSnapshot} from '../../domain/movie';
import {MovieWithRelations, toPersistence, toSnapshot} from './movie.mapper';

type Tx = CatalogPrismaTransaction;

@Injectable()
export class PrismaMovieRepository extends MovieRepositoryPort {
  constructor(private readonly prisma: CatalogPrismaAccessor) {
    super();
  }

  async findByTmdbId(tmdbId: number): Promise<Movie | null> {
    const movie: MovieWithRelations | null = await this.prisma.movie.findUnique({
      where: { tmdbId },
      include: {
        genres: { include: { genre: true } },
        keywords: { include: { keyword: true } },
      },
    });

    if (!movie) {
      return null;
    }

    return Movie.hydrate(toSnapshot(movie));
  }

  async save(movie: Movie, options: SaveOptions = {}): Promise<Movie> {
    const strategy: SaveStrategy = options.strategy ?? 'single';
    return await this.prisma.runInTransaction(async tx => {
      return this.saveWithinTransaction(tx, movie.toSnapshot(), strategy);
    });
  }

  async saveMany(movies: Movie[], options: SaveManyOptions = {}): Promise<Movie[]> {
    if (movies.length === 0) {
      return [];
    }

    const strategy: SaveStrategy = options.strategy ?? 'batch';
    const chunkSize = Math.max(1, options.chunkSize ?? 100);
    const results: Movie[] = [];

    for (const chunk of this.chunkMovies(movies, chunkSize)) {
      const savedChunk = await this.prisma.runInTransaction(async tx => {
        const persisted: Movie[] = [];
        for (const movie of chunk) {
          const saved = await this.saveWithinTransaction(tx, movie.toSnapshot(), strategy);
          persisted.push(saved);
        }
        return persisted;
      });
      results.push(...savedChunk);
    }

    return results;
  }

  private async syncGenres(tx: Tx, tmdbId: number, genres: string[], strategy: SaveStrategy): Promise<void> {
    const uniqueNames = this.uniqueNames(genres);

    if (strategy === 'batch') {
      await this.syncGenresWithDiff(tx, tmdbId, uniqueNames);
      return;
    }

    await this.syncGenresFullReplace(tx, tmdbId, uniqueNames);
  }

  private async syncGenresFullReplace(tx: Tx, tmdbId: number, genres: string[]): Promise<void> {
    await tx.movieGenre.deleteMany({ where: { tmdbId } });

    if (genres.length === 0) {
      return;
    }

    const genreMap = await this.ensureGenres(tx, genres);
    const data = genres
      .map(name => genreMap.get(name))
      .filter((genreId): genreId is number => typeof genreId === 'number')
      .map(genreId => ({ tmdbId, genreId }));

    if (data.length > 0) {
      await tx.movieGenre.createMany({ data });
    }
  }

  private async syncGenresWithDiff(tx: Tx, tmdbId: number, desiredGenres: string[]): Promise<void> {
    const desiredSet = new Set(desiredGenres);

    const currentRelations = await tx.movieGenre.findMany({
      where: { tmdbId },
      include: { genre: { select: { id: true, name: true } } },
    });

    const currentByName = new Map(currentRelations.map(rel => [rel.genre.name, rel.genreId]));

    const toRemove = currentRelations
      .filter(rel => !desiredSet.has(rel.genre.name))
      .map(rel => rel.genreId);

    const toAddNames = desiredGenres.filter(name => !currentByName.has(name));

    if (toAddNames.length === 0 && toRemove.length === 0) {
      return;
    }

    if (toAddNames.length > 0) {
      const genreMap = await this.ensureGenres(tx, desiredGenres);
      const data = toAddNames
        .map(name => genreMap.get(name))
        .filter((genreId): genreId is number => typeof genreId === 'number')
        .map(genreId => ({ tmdbId, genreId }));

      if (data.length > 0) {
        await tx.movieGenre.createMany({ data, skipDuplicates: true });
      }
    }

    if (toRemove.length > 0) {
      await tx.movieGenre.deleteMany({
        where: { tmdbId, genreId: { in: toRemove } },
      });
    }
  }

  private async ensureGenres(tx: Tx, names: string[]): Promise<Map<string, number>> {
    const uniqueNames = this.uniqueNames(names);
    const result = new Map<string, number>();

    if (uniqueNames.length === 0) {
      return result;
    }

    const existing = await tx.genre.findMany({
      where: { name: { in: uniqueNames } },
    });

    for (const genre of existing) {
      result.set(genre.name, genre.id);
    }

    const missing = uniqueNames.filter(name => !result.has(name));

    if (missing.length > 0) {
      await tx.genre.createMany({
        data: missing.map(name => ({ name })),
        skipDuplicates: true,
      });

      const created = await tx.genre.findMany({
        where: { name: { in: missing } },
      });

      for (const genre of created) {
        result.set(genre.name, genre.id);
      }
    }

    return result;
  }

  private async syncKeywords(tx: Tx, tmdbId: number, keywords: string[], strategy: SaveStrategy): Promise<void> {
    const uniqueNames = this.uniqueNames(keywords);

    if (strategy === 'batch') {
      await this.syncKeywordsWithDiff(tx, tmdbId, uniqueNames);
      return;
    }

    await this.syncKeywordsFullReplace(tx, tmdbId, uniqueNames);
  }

  private async syncKeywordsFullReplace(tx: Tx, tmdbId: number, keywords: string[]): Promise<void> {
    await tx.movieKeyword.deleteMany({ where: { tmdbId } });

    if (keywords.length === 0) {
      return;
    }

    const keywordMap = await this.ensureKeywords(tx, keywords);
    const data = keywords
      .map(name => keywordMap.get(name))
      .filter((keywordId): keywordId is number => typeof keywordId === 'number')
      .map(keywordId => ({ tmdbId, keywordId }));

    if (data.length > 0) {
      await tx.movieKeyword.createMany({ data });
    }
  }

  private async syncKeywordsWithDiff(tx: Tx, tmdbId: number, desiredKeywords: string[]): Promise<void> {
    const desiredSet = new Set(desiredKeywords);

    const currentRelations = await tx.movieKeyword.findMany({
      where: { tmdbId },
      include: { keyword: { select: { id: true, name: true } } },
    });

    const currentByName = new Map(currentRelations.map(rel => [rel.keyword.name, rel.keywordId]));

    const toRemove = currentRelations
      .filter(rel => !desiredSet.has(rel.keyword.name))
      .map(rel => rel.keywordId);

    const toAddNames = desiredKeywords.filter(name => !currentByName.has(name));

    if (toAddNames.length === 0 && toRemove.length === 0) {
      return;
    }

    if (toAddNames.length > 0) {
      const keywordMap = await this.ensureKeywords(tx, desiredKeywords);
      const data = toAddNames
        .map(name => keywordMap.get(name))
        .filter((keywordId): keywordId is number => typeof keywordId === 'number')
        .map(keywordId => ({ tmdbId, keywordId }));

      if (data.length > 0) {
        await tx.movieKeyword.createMany({ data, skipDuplicates: true });
      }
    }

    if (toRemove.length > 0) {
      await tx.movieKeyword.deleteMany({
        where: { tmdbId, keywordId: { in: toRemove } },
      });
    }
  }

  private async ensureKeywords(tx: Tx, names: string[]): Promise<Map<string, number>> {
    const uniqueNames = this.uniqueNames(names);
    const result = new Map<string, number>();

    if (uniqueNames.length === 0) {
      return result;
    }

    const existing = await tx.keyword.findMany({
      where: { name: { in: uniqueNames } },
    });

    for (const keyword of existing) {
      result.set(keyword.name, keyword.id);
    }

    const missing = uniqueNames.filter(name => !result.has(name));

    if (missing.length > 0) {
      await tx.keyword.createMany({
        data: missing.map(name => ({ name })),
        skipDuplicates: true,
      });

      const created = await tx.keyword.findMany({
        where: { name: { in: missing } },
      });

      for (const keyword of created) {
        result.set(keyword.name, keyword.id);
      }
    }

    return result;
  }

  private uniqueNames(names: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const name of names) {
      if (!name) {
        continue;
      }

      if (!seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }

    return result;
  }

  private async saveWithinTransaction(tx: Tx, snapshot: MovieSnapshot, strategy: SaveStrategy): Promise<Movie> {
    const existingMeta = await tx.movie.findUnique({
      where: { tmdbId: snapshot.tmdbId },
      select: {
        sourceHash: true,
        sourceUpdatedAt: true,
      },
    });

    const shouldSkip = this.shouldSkipUpdate(existingMeta, snapshot);

    if (!shouldSkip) {
      await tx.movie.upsert({
        where: { tmdbId: snapshot.tmdbId },
        update: toPersistence(snapshot),
        create: toPersistence(snapshot),
      });

      await this.syncGenres(tx, snapshot.tmdbId, snapshot.genres, strategy);
      await this.syncKeywords(tx, snapshot.tmdbId, snapshot.keywords, strategy);
    } else {
      await tx.movie.update({
        where: { tmdbId: snapshot.tmdbId },
        data: {
          syncedAt: snapshot.syncedAt,
        },
      });
    }

    const reloaded = await tx.movie.findUnique({
      where: { tmdbId: snapshot.tmdbId },
      include: {
        genres: { include: { genre: true } },
        keywords: { include: { keyword: true } },
      },
    });

    if (!reloaded) {
      return Movie.hydrate(snapshot);
    }

    return Movie.hydrate(toSnapshot(reloaded));
  }

  private shouldSkipUpdate(
    existingMeta: { sourceHash: string | null; sourceUpdatedAt: Date | null } | null,
    snapshot: MovieSnapshot,
  ): boolean {
    if (!existingMeta?.sourceHash || !snapshot.sourceHash) {
      return false;
    }

    const snapshotSourceUpdatedAt = snapshot.sourceUpdatedAt?.getTime() ?? null;
    const existingSourceUpdatedAt = existingMeta.sourceUpdatedAt?.getTime() ?? null;

    return existingMeta.sourceHash === snapshot.sourceHash && snapshotSourceUpdatedAt === existingSourceUpdatedAt;
  }

  private chunkMovies<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
