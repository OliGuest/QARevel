import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Report, TestRun, TestStepResult } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, TestRun, TestStepResult]),
    BullModule.registerQueue({ name: 'report-generation' }),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
