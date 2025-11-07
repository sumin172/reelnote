import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { CatalogCorePrismaService } from './catalog-core.prisma.service';

@Module({
  imports: [DatabaseModule],
  providers: [CatalogCorePrismaService],
  exports: [CatalogCorePrismaService],
})
export class CatalogCorePrismaModule {}


