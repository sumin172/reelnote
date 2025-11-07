import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CatalogCorePrismaModule } from '../database/catalog-core/catalog-core.prisma.module';
import { TmdbModule } from '../tmdb/tmdb.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CatalogCorePrismaModule, TmdbModule, CacheModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}

