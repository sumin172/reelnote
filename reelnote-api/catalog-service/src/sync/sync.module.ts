import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { MoviesModule } from '../movies/movies.module';
import { TmdbModule } from '../tmdb/tmdb.module';

@Module({
  imports: [MoviesModule, TmdbModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}

