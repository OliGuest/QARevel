import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { TestRun, TestStepResult, Attachment } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([TestRun, TestStepResult, Attachment])],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
