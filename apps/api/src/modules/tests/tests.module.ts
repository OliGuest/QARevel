import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TestsService } from './tests.service';
import { TestAnalyticsService } from './test-analytics.service';
import {
  TestCasesController,
  TestSuitesController,
  TestRunsController,
} from './tests.controller';
import { TestRunsInternalController } from './test-runs-internal.controller';
import {
  TestCase,
  TestStep,
  TestSuite,
  TestRun,
  TestStepResult,
  Environment,
} from '../../database/entities';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestCase,
      TestStep,
      TestSuite,
      TestRun,
      TestStepResult,
      Environment,
    ]),
    BullModule.registerQueue({ name: 'test-execution' }),
    BullModule.registerQueue({ name: 'report-generation' }),
    GatewayModule,
  ],
  providers: [TestsService, TestAnalyticsService],
  controllers: [
    TestCasesController,
    TestSuitesController,
    TestRunsController,
    TestRunsInternalController,
  ],
  exports: [TestsService],
})
export class TestsModule {}
