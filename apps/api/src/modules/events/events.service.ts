import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClickEvent, CrashEvent } from '../../database/entities';
import { ClickEventDto, CrashEventDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(ClickEvent)
    private readonly clickRepo: Repository<ClickEvent>,
    @InjectRepository(CrashEvent)
    private readonly crashRepo: Repository<CrashEvent>,
  ) {}

  // ── Click Events ──

  async ingestClickEvents(events: ClickEventDto[]): Promise<{ inserted: number }> {
    const entities = events.map((e) =>
      this.clickRepo.create({
        testRunId: e.testRunId || null,
        testStepResultId: e.testStepResultId || null,
        correlationId: e.correlationId,
        eventType: e.eventType,
        targetElement: e.targetElement || null,
        targetText: e.targetText || null,
        screenName: e.screenName || null,
        coordinates: e.coordinates || null,
        inputValue: e.inputValue || null,
        deviceId: e.deviceId || null,
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      }),
    );

    await this.clickRepo.save(entities);
    return { inserted: entities.length };
  }

  async queryClickEvents(filters: {
    correlationId?: string;
    testRunId?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ events: ClickEvent[]; total: number }> {
    const qb = this.clickRepo.createQueryBuilder('click');

    if (filters.correlationId) {
      qb.andWhere('click.correlation_id = :cid', { cid: filters.correlationId });
    }
    if (filters.testRunId) {
      qb.andWhere('click.test_run_id = :trid', { trid: filters.testRunId });
    }
    if (filters.eventType) {
      qb.andWhere('click.event_type = :et', { et: filters.eventType });
    }

    qb.orderBy('click.timestamp', 'ASC');

    const total = await qb.getCount();
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const events = await qb.getMany();
    return { events, total };
  }

  // ── Crash Events ──

  async ingestCrashEvent(dto: CrashEventDto): Promise<CrashEvent> {
    const entity = this.crashRepo.create({
      testRunId: dto.testRunId || null,
      correlationId: dto.correlationId,
      deviceId: dto.deviceId || null,
      severity: dto.severity,
      type: dto.type || null,
      message: dto.message,
      stackTrace: dto.stackTrace || null,
      lastActions: dto.lastActions || null,
      lastApiCalls: dto.lastApiCalls || null,
      deviceState: dto.deviceState || null,
      screenshotKey: dto.screenshotKey || null,
    });

    return this.crashRepo.save(entity);
  }

  async queryCrashEvents(filters: {
    correlationId?: string;
    testRunId?: string;
    severity?: string;
    isResolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ events: CrashEvent[]; total: number }> {
    const qb = this.crashRepo.createQueryBuilder('crash');

    if (filters.correlationId) {
      qb.andWhere('crash.correlation_id = :cid', { cid: filters.correlationId });
    }
    if (filters.testRunId) {
      qb.andWhere('crash.test_run_id = :trid', { trid: filters.testRunId });
    }
    if (filters.severity) {
      qb.andWhere('crash.severity = :sev', { sev: filters.severity });
    }
    if (filters.isResolved !== undefined) {
      qb.andWhere('crash.is_resolved = :resolved', { resolved: filters.isResolved });
    }

    qb.orderBy('crash.occurred_at', 'DESC');

    const total = await qb.getCount();
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const events = await qb.getMany();
    return { events, total };
  }

  async resolveCrash(crashId: string, userId: string, isResolved: boolean): Promise<CrashEvent> {
    const crash = await this.crashRepo.findOne({ where: { id: crashId } });
    if (!crash) throw new Error(`CrashEvent ${crashId} not found`);

    crash.isResolved = isResolved;
    crash.resolvedById = isResolved ? userId : null;
    crash.resolvedAt = isResolved ? new Date() : null;

    return this.crashRepo.save(crash);
  }
}
