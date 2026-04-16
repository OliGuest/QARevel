import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertRule, TestRun, Environment } from '../../database/entities';
import { CreateAlertRuleDto, UpdateAlertRuleDto } from './dto/alert.dto';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(AlertRule)
    private readonly alertRepo: Repository<AlertRule>,
    @InjectRepository(TestRun)
    private readonly testRunRepo: Repository<TestRun>,
    @InjectRepository(Environment)
    private readonly environmentRepo: Repository<Environment>,
  ) {}

  async create(dto: CreateAlertRuleDto, userId: string): Promise<AlertRule> {
    const rule = this.alertRepo.create({
      name: dto.name,
      conditionType: dto.conditionType,
      threshold: dto.threshold,
      testCaseId: dto.testCaseId || null,
      environmentId: dto.environmentId || null,
      createdById: userId,
    });
    return this.alertRepo.save(rule);
  }

  async findAll(): Promise<AlertRule[]> {
    return this.alertRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<AlertRule> {
    const rule = await this.alertRepo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`AlertRule ${id} not found`);
    return rule;
  }

  async update(id: string, dto: UpdateAlertRuleDto): Promise<AlertRule> {
    const rule = await this.findById(id);
    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.threshold !== undefined) rule.threshold = dto.threshold;
    if (dto.enabled !== undefined) rule.enabled = dto.enabled;
    return this.alertRepo.save(rule);
  }

  async delete(id: string): Promise<void> {
    const rule = await this.findById(id);
    await this.alertRepo.remove(rule);
  }

  async evaluateAll(): Promise<{ evaluated: number; triggered: number }> {
    const rules = await this.alertRepo.find({ where: { enabled: true } });
    let triggered = 0;

    for (const rule of rules) {
      try {
        const didTrigger = await this.evaluateRule(rule);
        if (didTrigger) {
          rule.lastTriggeredAt = new Date();
          rule.triggerCount += 1;
          await this.alertRepo.save(rule);
          triggered++;
        }
      } catch (err) {
        this.logger.error(`Failed to evaluate rule ${rule.id}: ${(err as Error).message}`);
      }
    }

    return { evaluated: rules.length, triggered };
  }

  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    switch (rule.conditionType) {
      case 'test_failure_streak':
        return this.checkFailureStreak(rule);
      case 'error_rate_threshold':
        return this.checkErrorRate(rule);
      case 'environment_down':
        return this.checkEnvironmentDown(rule);
      case 'flaky_detected':
        return this.checkFlakyTest(rule);
      default:
        return false;
    }
  }

  private async checkFailureStreak(rule: AlertRule): Promise<boolean> {
    const qb = this.testRunRepo.createQueryBuilder('run')
      .orderBy('run.created_at', 'DESC')
      .take(rule.threshold);

    if (rule.testCaseId) {
      qb.andWhere('run.test_case_id = :tcid', { tcid: rule.testCaseId });
    }

    const recentRuns = await qb.getMany();
    if (recentRuns.length < rule.threshold) return false;

    return recentRuns.every((r) => r.status === 'failed' || r.status === 'error');
  }

  private async checkErrorRate(rule: AlertRule): Promise<boolean> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
    const qb = this.testRunRepo.createQueryBuilder('run')
      .where('run.created_at >= :since', { since });

    if (rule.testCaseId) {
      qb.andWhere('run.test_case_id = :tcid', { tcid: rule.testCaseId });
    }

    const runs = await qb.getMany();
    if (runs.length === 0) return false;

    const failedCount = runs.filter((r) => r.status === 'failed' || r.status === 'error').length;
    const errorRate = (failedCount / runs.length) * 100;

    return errorRate >= rule.threshold;
  }

  private async checkEnvironmentDown(rule: AlertRule): Promise<boolean> {
    if (!rule.environmentId) return false;

    const env = await this.environmentRepo.findOne({ where: { id: rule.environmentId } });
    if (!env || !env.healthCheckUrl) return false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(env.healthCheckUrl, { signal: controller.signal });
      clearTimeout(timeout);
      return !response.ok;
    } catch {
      return true; // unreachable = down
    }
  }

  private async checkFlakyTest(rule: AlertRule): Promise<boolean> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days
    const qb = this.testRunRepo.createQueryBuilder('run')
      .where('run.created_at >= :since', { since })
      .andWhere('run.status IN (:...statuses)', { statuses: ['passed', 'failed', 'error'] });

    if (rule.testCaseId) {
      qb.andWhere('run.test_case_id = :tcid', { tcid: rule.testCaseId });
    }

    const runs = await qb.getMany();
    if (runs.length < 3) return false;

    const failedCount = runs.filter((r) => r.status === 'failed' || r.status === 'error').length;
    const failureRate = (failedCount / runs.length) * 100;

    // Flaky = fails sometimes but not always (between threshold% and 80%)
    return failureRate >= rule.threshold && failureRate < 80;
  }
}
