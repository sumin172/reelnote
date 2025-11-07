import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { CatalogCorePrismaModule } from '../database/catalog-core/catalog-core.prisma.module';

@Module({
  imports: [CatalogCorePrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

