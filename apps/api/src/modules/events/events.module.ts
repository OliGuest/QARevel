import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { ClickEvent, CrashEvent } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ClickEvent, CrashEvent])],
  providers: [EventsService],
  controllers: [EventsController],
  exports: [EventsService],
})
export class EventsModule {}
