import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CatalogPrismaAccessor } from './catalog-prisma.accessor';

@Module({
  imports: [DatabaseModule],
  providers: [CatalogPrismaAccessor],
  exports: [CatalogPrismaAccessor],
})
export class CatalogPrismaModule {}


