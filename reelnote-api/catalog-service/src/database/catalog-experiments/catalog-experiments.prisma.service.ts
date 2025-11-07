import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CatalogExperimentsPrismaService {
  constructor(private readonly prisma: PrismaService) {}

  get movieFeature() {
    return this.prisma.movieFeature;
  }

  get userProfile() {
    return this.prisma.userProfile;
  }
}


