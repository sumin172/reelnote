import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { CatalogExperimentsPrismaService } from './catalog-experiments.prisma.service';

@Module({
  imports: [DatabaseModule],
  providers: [CatalogExperimentsPrismaService],
  exports: [CatalogExperimentsPrismaService],
})
export class CatalogExperimentsPrismaModule {}


