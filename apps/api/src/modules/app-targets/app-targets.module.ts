import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppTargetsService } from './app-targets.service';
import { AppTargetsController } from './app-targets.controller';
import { AppTarget } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([AppTarget])],
  providers: [AppTargetsService],
  controllers: [AppTargetsController],
  exports: [AppTargetsService],
})
export class AppTargetsModule {}
