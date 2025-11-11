import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CatalogPrismaModule } from '../infrastructure/db/catalog-prisma.module';
import { TmdbModule } from '../tmdb/tmdb.module';
import { CacheModule } from '../cache/cache.module';
import { SearchReadAggregator } from './application/search-read.aggregator';
import { SearchReadPort } from './application/search-read.port';
import { SearchLocalReadAdapter } from './infrastructure/search-local.read.adapter';
import { SearchTmdbReadAdapter } from './infrastructure/search-tmdb.read.adapter';

@Module({
  imports: [CatalogPrismaModule, TmdbModule, CacheModule],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchLocalReadAdapter,
    SearchTmdbReadAdapter,
    {
      provide: SearchReadPort,
      useClass: SearchReadAggregator,
    },
  ],
})
export class SearchModule {}

