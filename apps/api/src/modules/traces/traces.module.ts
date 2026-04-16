import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TracesService } from './traces.service';
import { TracesController } from './traces.controller';
import { ApiTrace } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ApiTrace])],
  providers: [TracesService],
  controllers: [TracesController],
  exports: [TracesService],
})
export class TracesModule {}
