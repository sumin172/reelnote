import { Prisma } from "@prisma/client";
import { MovieSnapshot } from "../../domain/movie.js";

export type MovieWithRelations = Prisma.MovieGetPayload<{
  include: {
    genres: { include: { genre: true } };
    keywords: { include: { keyword: true } };
  };
}>;

export function toPersistence(
  snapshot: MovieSnapshot,
): Prisma.MovieUncheckedCreateInput {
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
    sourceUpdatedAt: snapshot.sourceUpdatedAt ?? null,
    sourceHash: snapshot.sourceHash ?? null,
    rawJson: (snapshot.rawPayload ?? {}) as Prisma.InputJsonValue,
  };
}

export function toSnapshot(movie: MovieWithRelations): MovieSnapshot {
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
    sourceUpdatedAt: movie.sourceUpdatedAt ?? undefined,
    sourceHash: movie.sourceHash ?? undefined,
    genres: movie.genres?.map((g) => g.genre.name) ?? [],
    keywords: movie.keywords?.map((k) => k.keyword.name) ?? [],
    rawPayload: movie.rawJson,
  };
}
