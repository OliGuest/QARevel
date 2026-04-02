import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { RecordingsService } from './recordings.service';
import { RecordingsController } from './recordings.controller';
import { TestRun, RecordingEvent, Environment } from '../../database/entities';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestRun, RecordingEvent, Environment]),
    BullModule.registerQueue({ name: 'test-execution' }),
    GatewayModule,
  ],
  providers: [RecordingsService],
  controllers: [RecordingsController],
})
export class RecordingsModule {}
