import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsObject, IsNumber } from 'class-validator';
import { TestsService } from './tests.service';
import { EventsGateway } from '../gateway/events.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// DTO for runner step results (snake_case matching BaseExecutor.sendStepResult)
class CreateStepResultDto {
  @IsOptional()
  @IsString()
  test_step_id?: string;

  @IsInt()
  step_number: number;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  actual_result?: string;

  @IsOptional()
  @IsString()
  error_message?: string;

  @IsOptional()
  @IsString()
  screenshot_key?: string;

  @IsOptional()
  @IsNumber()
  duration_ms?: number;
}

class UpdateRunStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsObject()
  summary?: Record<string, unknown>;
}

/**
 * Internal endpoints for the runner service.
 * POST/PATCH endpoints have no JWT guard — the runner is a trusted internal service.
 */
@ApiTags('Test Runs (Internal)')
@Controller('test-runs')
export class TestRunsInternalController {
  constructor(
    private readonly testsService: TestsService,
    private readonly gateway: EventsGateway,
  ) {}

  /** Runner posts step results here as each step completes */
  @Post(':id/step-results')
  @ApiOperation({ summary: 'Add step result (internal — runner)' })
  async addStepResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStepResultDto,
  ) {
    const result = await this.testsService.addStepResult(id, {
      testStepId: dto.test_step_id || null,
      stepNumber: dto.step_number,
      status: dto.status,
      actualResult: dto.actual_result || null,
      errorMessage: dto.error_message || null,
      screenshotKey: dto.screenshot_key || null,
      durationMs: dto.duration_ms || null,
    });

    this.gateway.emitToTestRun(id, 'step-result', result);
    return result;
  }

  /** Runner updates test run status/summary here */
  @Patch(':id')
  @ApiOperation({ summary: 'Update test run status (internal — runner)' })
  async updateRunStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRunStatusDto,
  ) {
    const updated = await this.testsService.updateRunStatus(
      id,
      dto.status,
      dto.summary,
    );

    this.gateway.emitToTestRun(id, 'status-update', {
      id: updated.id,
      status: updated.status,
      summary: updated.summary,
      completedAt: updated.completedAt,
      durationMs: updated.durationMs,
    });
    return updated;
  }

  /** Frontend fetches step results for a test run (JWT required) */
  @Get(':id/step-results')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get step results for a test run' })
  async getStepResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.testsService.findStepResults(id);
  }
}
