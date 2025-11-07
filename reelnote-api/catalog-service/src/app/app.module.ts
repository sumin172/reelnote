import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { CacheModule } from '../cache/cache.module';
import { TmdbModule } from '../tmdb/tmdb.module';
import { MoviesModule } from '../movies/movies.module';
import { SyncModule } from '../sync/sync.module';
import { SearchModule } from '../search/search.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    CacheModule,
    TmdbModule,
    MoviesModule,
    SyncModule,
    SearchModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
