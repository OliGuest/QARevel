import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import {
  TestCase,
  TestStep,
  TestSuite,
  TestRun,
  TestStepResult,
  Environment,
} from '../../database/entities';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
  CreateTestStepDto,
  UpdateTestStepDto,
  CreateTestSuiteDto,
  UpdateTestSuiteDto,
  StartTestRunDto,
} from './dto/test.dto';

@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);

  constructor(
    @InjectRepository(TestCase)
    private readonly testCaseRepo: Repository<TestCase>,
    @InjectRepository(TestStep)
    private readonly testStepRepo: Repository<TestStep>,
    @InjectRepository(TestSuite)
    private readonly testSuiteRepo: Repository<TestSuite>,
    @InjectRepository(TestRun)
    private readonly testRunRepo: Repository<TestRun>,
    @InjectRepository(TestStepResult)
    private readonly stepResultRepo: Repository<TestStepResult>,
    @InjectRepository(Environment)
    private readonly environmentRepo: Repository<Environment>,
    @InjectQueue('test-execution')
    private readonly testQueue: Queue,
  ) {}

  // ── Test Cases ──

  async findAllCases(filters?: {
    platform?: string;
    type?: string;
    tags?: string[];
  }): Promise<TestCase[]> {
    const qb = this.testCaseRepo.createQueryBuilder('tc');

    if (filters?.platform) {
      qb.andWhere('tc.platform = :platform', { platform: filters.platform });
    }
    if (filters?.type) {
      qb.andWhere('tc.type = :type', { type: filters.type });
    }
    if (filters?.tags && filters.tags.length > 0) {
      qb.andWhere('tc.tags && :tags', { tags: filters.tags });
    }

    qb.orderBy('tc.created_at', 'DESC');
    return qb.getMany();
  }

  async findCaseById(id: string): Promise<TestCase> {
    const tc = await this.testCaseRepo.findOne({
      where: { id },
      relations: ['steps', 'appTarget'],
    });
    if (!tc) throw new NotFoundException(`TestCase ${id} not found`);
    if (tc.steps) {
      tc.steps.sort((a, b) => a.stepNumber - b.stepNumber);
    }
    return tc;
  }

  async createCase(dto: CreateTestCaseDto, userId: string): Promise<TestCase> {
    const tc = this.testCaseRepo.create({
      title: dto.title,
      description: dto.description || null,
      appTargetId: dto.appTargetId || null,
      platform: dto.platform,
      priority: dto.priority || 'medium',
      type: dto.type || 'manual',
      tags: dto.tags || [],
      preconditions: dto.preconditions || null,
      automationCode: dto.automationCode || null,
      estimatedDurationSec: dto.estimatedDurationSec || null,
      createdById: userId,
    });
    return this.testCaseRepo.save(tc);
  }

  async updateCase(id: string, dto: UpdateTestCaseDto): Promise<TestCase> {
    const tc = await this.findCaseById(id);

    if (dto.title !== undefined) tc.title = dto.title;
    if (dto.description !== undefined) tc.description = dto.description;
    if (dto.appTargetId !== undefined) tc.appTargetId = dto.appTargetId;
    if (dto.platform !== undefined) tc.platform = dto.platform;
    if (dto.priority !== undefined) tc.priority = dto.priority;
    if (dto.type !== undefined) tc.type = dto.type;
    if (dto.tags !== undefined) tc.tags = dto.tags;
    if (dto.preconditions !== undefined) tc.preconditions = dto.preconditions;
    if (dto.automationCode !== undefined) tc.automationCode = dto.automationCode;
    if (dto.estimatedDurationSec !== undefined)
      tc.estimatedDurationSec = dto.estimatedDurationSec;

    return this.testCaseRepo.save(tc);
  }

  async deleteCase(id: string): Promise<void> {
    const tc = await this.findCaseById(id);
    await this.testCaseRepo.remove(tc);
  }

  // ── Test Steps ──

  async createStep(testCaseId: string, dto: CreateTestStepDto): Promise<TestStep> {
    await this.findCaseById(testCaseId); // ensure exists
    const step = this.testStepRepo.create({
      testCaseId,
      stepNumber: dto.stepNumber,
      action: dto.action,
      expectedResult: dto.expectedResult || null,
      selector: dto.selector || null,
      selectorType: dto.selectorType || null,
      inputData: dto.inputData || null,
      timeoutMs: dto.timeoutMs ?? 10000,
      isOptional: dto.isOptional ?? false,
    });
    return this.testStepRepo.save(step);
  }

  async updateStep(
    testCaseId: string,
    stepId: string,
    dto: UpdateTestStepDto,
  ): Promise<TestStep> {
    const step = await this.testStepRepo.findOne({
      where: { id: stepId, testCaseId },
    });
    if (!step) throw new NotFoundException(`TestStep ${stepId} not found`);

    if (dto.stepNumber !== undefined) step.stepNumber = dto.stepNumber;
    if (dto.action !== undefined) step.action = dto.action;
    if (dto.expectedResult !== undefined) step.expectedResult = dto.expectedResult;
    if (dto.selector !== undefined) step.selector = dto.selector;
    if (dto.selectorType !== undefined) step.selectorType = dto.selectorType;
    if (dto.inputData !== undefined) step.inputData = dto.inputData;
    if (dto.timeoutMs !== undefined) step.timeoutMs = dto.timeoutMs;
    if (dto.isOptional !== undefined) step.isOptional = dto.isOptional;

    return this.testStepRepo.save(step);
  }

  async deleteStep(testCaseId: string, stepId: string): Promise<void> {
    const step = await this.testStepRepo.findOne({
      where: { id: stepId, testCaseId },
    });
    if (!step) throw new NotFoundException(`TestStep ${stepId} not found`);
    await this.testStepRepo.remove(step);
  }

  // ── Test Suites ──

  async findAllSuites(): Promise<TestSuite[]> {
    return this.testSuiteRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findSuiteById(id: string): Promise<TestSuite> {
    const suite = await this.testSuiteRepo.findOne({
      where: { id },
      relations: ['testCases', 'appTarget'],
    });
    if (!suite) throw new NotFoundException(`TestSuite ${id} not found`);
    return suite;
  }

  async createSuite(dto: CreateTestSuiteDto, userId: string): Promise<TestSuite> {
    const suite = this.testSuiteRepo.create({
      name: dto.name,
      description: dto.description || null,
      appTargetId: dto.appTargetId || null,
      tags: dto.tags || [],
      createdById: userId,
    });
    return this.testSuiteRepo.save(suite);
  }

  async updateSuite(id: string, dto: UpdateTestSuiteDto): Promise<TestSuite> {
    const suite = await this.findSuiteById(id);

    if (dto.name !== undefined) suite.name = dto.name;
    if (dto.description !== undefined) suite.description = dto.description;
    if (dto.appTargetId !== undefined) suite.appTargetId = dto.appTargetId;
    if (dto.tags !== undefined) suite.tags = dto.tags;

    return this.testSuiteRepo.save(suite);
  }

  async addCaseToSuite(suiteId: string, testCaseId: string): Promise<TestSuite> {
    const suite = await this.findSuiteById(suiteId);
    const testCase = await this.findCaseById(testCaseId);

    if (!suite.testCases) suite.testCases = [];
    const alreadyAdded = suite.testCases.some((c) => c.id === testCaseId);
    if (!alreadyAdded) {
      suite.testCases.push(testCase);
      await this.testSuiteRepo.save(suite);
    }

    return this.findSuiteById(suiteId);
  }

  async removeCaseFromSuite(suiteId: string, caseId: string): Promise<void> {
    const suite = await this.findSuiteById(suiteId);
    suite.testCases = suite.testCases.filter((c) => c.id !== caseId);
    await this.testSuiteRepo.save(suite);
  }

  // ── Test Runs ──

  async startRun(dto: StartTestRunDto, userId: string): Promise<TestRun> {
    if (!dto.suiteId && !dto.testCaseId) {
      throw new BadRequestException('Either suiteId or testCaseId is required');
    }

    const now = new Date();
    const correlationId = `run-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 8)}`;

    const run = this.testRunRepo.create({
      suiteId: dto.suiteId || null,
      testCaseId: dto.testCaseId || null,
      deviceId: dto.deviceId,
      environmentId: dto.environmentId,
      appTargetId: dto.appTargetId,
      triggeredById: userId,
      type: dto.type,
      status: 'pending',
      correlationId,
      config: dto.config || {},
      startedAt: now,
    });

    const saved = await this.testRunRepo.save(run);

    // Enqueue BullMQ job for automated runs
    if (dto.type === 'automated' && dto.testCaseId) {
      try {
        const testCase = await this.findCaseById(dto.testCaseId);
        const environment = await this.environmentRepo.findOne({
          where: { id: dto.environmentId },
        });

        if (environment && testCase.steps?.length > 0) {
          const jobData = {
            testRunId: saved.id,
            correlationId,
            environmentBaseUrl: environment.baseUrl,
            executorType: 'playwright',
            steps: testCase.steps.map((s) => ({
              id: s.id,
              stepNumber: s.stepNumber,
              action: s.action,
              selector: s.selector,
              selectorType: s.selectorType,
              inputData: s.inputData,
              expectedResult: s.expectedResult,
              timeoutMs: s.timeoutMs,
              isOptional: s.isOptional,
            })),
            config: dto.config || {},
            envVars: {},
          };

          await this.testQueue.add('execute', jobData, { jobId: saved.id });
          this.logger.log(`Enqueued test-execution job for run ${saved.id}`);
        }
      } catch (err) {
        this.logger.error(`Failed to enqueue job for run ${saved.id}: ${(err as Error).message}`);
      }
    }

    return saved;
  }

  async stopRun(id: string): Promise<TestRun> {
    const run = await this.findRunById(id);
    if (run.status === 'passed' || run.status === 'failed' || run.status === 'cancelled') {
      throw new BadRequestException(`Run is already ${run.status}`);
    }

    run.status = 'cancelled';
    run.completedAt = new Date();
    if (run.startedAt) {
      run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
    }

    return this.testRunRepo.save(run);
  }

  async findRunById(id: string): Promise<TestRun> {
    const run = await this.testRunRepo.findOne({
      where: { id },
      relations: ['suite', 'testCase', 'device', 'environment', 'appTarget', 'triggeredBy'],
    });
    if (!run) throw new NotFoundException(`TestRun ${id} not found`);
    return run;
  }

  async findAllRuns(filters?: {
    status?: string;
    type?: string;
  }): Promise<TestRun[]> {
    const qb = this.testRunRepo.createQueryBuilder('run');

    if (filters?.status) {
      qb.andWhere('run.status = :status', { status: filters.status });
    }
    if (filters?.type) {
      qb.andWhere('run.type = :type', { type: filters.type });
    }

    qb.orderBy('run.created_at', 'DESC');
    qb.take(100);
    return qb.getMany();
  }

  // ── Step Results (for runner callbacks) ──

  async addStepResult(
    testRunId: string,
    data: {
      testStepId: string | null;
      stepNumber: number;
      status: string;
      actualResult: string | null;
      errorMessage: string | null;
      screenshotKey: string | null;
      durationMs: number | null;
    },
  ): Promise<TestStepResult> {
    const result = this.stepResultRepo.create({
      testRunId,
      testStepId: data.testStepId,
      stepNumber: data.stepNumber,
      status: data.status,
      actualResult: data.actualResult,
      errorMessage: data.errorMessage,
      screenshotKey: data.screenshotKey,
      durationMs: data.durationMs,
    });
    return this.stepResultRepo.save(result);
  }

  async updateRunStatus(
    testRunId: string,
    status: string,
    summary?: Record<string, unknown>,
  ): Promise<TestRun> {
    const run = await this.testRunRepo.findOne({ where: { id: testRunId } });
    if (!run) throw new NotFoundException(`TestRun ${testRunId} not found`);

    run.status = status;
    if (summary) run.summary = summary;

    const terminalStatuses = ['passed', 'failed', 'error', 'cancelled'];
    if (terminalStatuses.includes(status) && !run.completedAt) {
      run.completedAt = new Date();
      if (run.startedAt) {
        run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();
      }
    }

    return this.testRunRepo.save(run);
  }

  async findStepResults(testRunId: string): Promise<TestStepResult[]> {
    return this.stepResultRepo.find({
      where: { testRunId },
      order: { stepNumber: 'ASC' },
    });
  }
}
