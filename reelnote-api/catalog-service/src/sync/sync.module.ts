import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller.js";
import { SyncService } from "./sync.service.js";
import { MoviesModule } from "../movies/movies.module.js";
import { TmdbModule } from "../tmdb/tmdb.module.js";
import { SyncConfig } from "../config/sync.config.js";

@Module({
  imports: [MoviesModule, TmdbModule],
  controllers: [SyncController],
  providers: [SyncConfig, SyncService],
})
export class SyncModule {}
