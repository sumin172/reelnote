import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller.js";
import { SearchService } from "./search.service.js";
import { CatalogPrismaModule } from "../infrastructure/db/catalog-prisma.module.js";
import { TmdbModule } from "../tmdb/tmdb.module.js";
import { CacheModule } from "../cache/cache.module.js";
import { SearchReadAggregator } from "./application/search-read.aggregator.js";
import { SearchReadPort } from "./application/search-read.port.js";
import { SearchLocalReadAdapter } from "./infrastructure/search-local.read.adapter.js";
import { SearchTmdbReadAdapter } from "./infrastructure/search-tmdb.read.adapter.js";

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
