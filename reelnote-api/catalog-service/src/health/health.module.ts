import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { CatalogPrismaModule } from '../infrastructure/db/catalog-prisma.module';

@Module({
  imports: [CatalogPrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

