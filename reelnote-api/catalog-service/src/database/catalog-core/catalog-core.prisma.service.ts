import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CatalogCorePrismaService {
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

  async ensureConnection(): Promise<void> {
    await this.prisma.$connect();
  }

  async countMovies(): Promise<number> {
    return this.prisma.movie.count();
  }
}


