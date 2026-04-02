import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, TestRun, TestStepResult } from '../../database/entities';
import { GenerateReportDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(TestRun)
    private readonly testRunRepo: Repository<TestRun>,
    @InjectRepository(TestStepResult)
    private readonly stepResultRepo: Repository<TestStepResult>,
  ) {}

  async generate(dto: GenerateReportDto, userId: string): Promise<Report> {
    const run = await this.testRunRepo.findOne({ where: { id: dto.testRunId } });
    if (!run) throw new NotFoundException(`TestRun ${dto.testRunId} not found`);

    // Build summary from step results
    const steps = await this.stepResultRepo.find({
      where: { testRunId: dto.testRunId },
    });

    const summary = {
      testRunId: run.id,
      correlationId: run.correlationId,
      type: run.type,
      status: run.status,
      totalSteps: steps.length,
      passed: steps.filter((s) => s.status === 'passed').length,
      failed: steps.filter((s) => s.status === 'failed').length,
      skipped: steps.filter((s) => s.status === 'skipped').length,
      error: steps.filter((s) => s.status === 'error').length,
      durationMs: run.durationMs,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };

    const report = this.reportRepo.create({
      testRunId: dto.testRunId,
      type: dto.type || 'standard',
      status: 'ready', // In production, this would be 'generating' and a BullMQ job would process it
      summary,
      generatedById: userId,
    });

    return this.reportRepo.save(report);
  }

  async findById(id: string): Promise<Report> {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['testRun', 'generatedBy'],
    });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return report;
  }

  async findAll(): Promise<Report[]> {
    return this.reportRepo.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
