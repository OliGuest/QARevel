import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertRule, TestRun, Environment } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([AlertRule, TestRun, Environment])],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
