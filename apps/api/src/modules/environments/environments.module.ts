import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';
import { Environment } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Environment])],
  providers: [EnvironmentsService],
  controllers: [EnvironmentsController],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
