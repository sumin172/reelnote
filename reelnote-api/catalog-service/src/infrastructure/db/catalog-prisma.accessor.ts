import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service.js";

export type CatalogPrismaTransaction = Prisma.TransactionClient;

@Injectable()
export class CatalogPrismaAccessor {
  constructor(private readonly prisma: PrismaService) {}

  get movie() {
    return this.prisma.movie;
  }

  get genre() {
    return this.prisma.genre;
  }

  get movieGenre() {
    return this.prisma.movieGenre;
  }

  get keyword() {
    return this.prisma.keyword;
  }

  get movieKeyword() {
    return this.prisma.movieKeyword;
  }

  get movieCast() {
    return this.prisma.movieCast;
  }

  get movieCrew() {
    return this.prisma.movieCrew;
  }

  get movieFeature() {
    return this.prisma.movieFeature;
  }

  get userProfile() {
    return this.prisma.userProfile;
  }

  async ensureConnection(): Promise<void> {
    await this.prisma.$connect();
  }

  async countMovies(): Promise<number> {
    return this.prisma.movie.count();
  }

  async runInTransaction<T>(
    handler: (tx: CatalogPrismaTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(handler);
  }
}
