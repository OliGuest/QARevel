import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TestRun, TestStepResult, Attachment } from '../../database/entities';
import { StartSessionDto, AddStepDto, CompleteSessionDto } from './dto/session.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(TestRun)
    private readonly testRunRepo: Repository<TestRun>,
    @InjectRepository(TestStepResult)
    private readonly stepResultRepo: Repository<TestStepResult>,
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
  ) {}

  async start(dto: StartSessionDto, userId: string) {
    const now = new Date();
    const correlationId = `session-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 8)}`;

    const run = this.testRunRepo.create({
      testCaseId: dto.testCaseId || null,
      deviceId: dto.deviceId,
      environmentId: dto.environmentId,
      appTargetId: dto.appTargetId,
      triggeredById: userId,
      type: 'manual',
      status: 'running',
      correlationId,
      startedAt: now,
      config: {},
    });

    const saved = await this.testRunRepo.save(run);
    return {
      testRunId: saved.id,
      correlationId: saved.correlationId,
      wsChannel: `test-run:${saved.id}`,
    };
  }

  async addStep(runId: string, dto: AddStepDto) {
    const run = await this.testRunRepo.findOne({ where: { id: runId } });
    if (!run) throw new NotFoundException(`TestRun ${runId} not found`);

    const result = this.stepResultRepo.create({
      testRunId: runId,
      testStepId: dto.testStepId || null,
      stepNumber: dto.stepNumber,
      status: dto.status,
      actualResult: dto.actualResult || null,
      errorMessage: dto.errorMessage || null,
      notes: dto.notes || null,
      durationMs: dto.durationMs || null,
    });

    return this.stepResultRepo.save(result);
  }

  async uploadScreenshot(
    runId: string,
    filename: string,
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
    userId: string,
    stepResultId?: string,
  ) {
    const run = await this.testRunRepo.findOne({ where: { id: runId } });
    if (!run) throw new NotFoundException(`TestRun ${runId} not found`);

    const attachment = this.attachmentRepo.create({
      testRunId: runId,
      testStepResultId: stepResultId || null,
      type: 'screenshot',
      filename,
      storageKey,
      mimeType,
      sizeBytes,
      uploadedById: userId,
    });

    return this.attachmentRepo.save(attachment);
  }

  async complete(runId: string, dto: CompleteSessionDto) {
    const run = await this.testRunRepo.findOne({ where: { id: runId } });
    if (!run) throw new NotFoundException(`TestRun ${runId} not found`);

    run.status = dto.status;
    run.completedAt = new Date();
    if (run.startedAt) {
      run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
    }

    // Build summary from step results
    const steps = await this.stepResultRepo.find({ where: { testRunId: runId } });
    const summary = {
      total: steps.length,
      passed: steps.filter((s) => s.status === 'passed').length,
      failed: steps.filter((s) => s.status === 'failed').length,
      skipped: steps.filter((s) => s.status === 'skipped').length,
      error: steps.filter((s) => s.status === 'error').length,
      notes: dto.notes || null,
    };
    run.summary = summary;

    return this.testRunRepo.save(run);
  }
}
