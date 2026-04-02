import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntry } from '../../database/entities';
import { LogEntryDto } from './dto/log.dto';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogEntry)
    private readonly logRepo: Repository<LogEntry>,
  ) {}

  async ingestBatch(entries: LogEntryDto[]): Promise<{ inserted: number }> {
    const logEntities = entries.map((e) =>
      this.logRepo.create({
        testRunId: e.testRunId || null,
        correlationId: e.correlationId,
        source: e.source,
        level: e.level,
        message: e.message,
        metadata: e.metadata || {},
        deviceId: e.deviceId || null,
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      }),
    );

    await this.logRepo.save(logEntities);
    return { inserted: logEntities.length };
  }

  async query(filters: {
    correlationId?: string;
    level?: string;
    testRunId?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: LogEntry[]; total: number }> {
    const qb = this.logRepo.createQueryBuilder('log');

    if (filters.correlationId) {
      qb.andWhere('log.correlation_id = :cid', { cid: filters.correlationId });
    }
    if (filters.level) {
      qb.andWhere('log.level = :level', { level: filters.level });
    }
    if (filters.testRunId) {
      qb.andWhere('log.test_run_id = :trid', { trid: filters.testRunId });
    }
    if (filters.source) {
      qb.andWhere('log.source = :source', { source: filters.source });
    }

    qb.orderBy('log.timestamp', 'DESC');

    const total = await qb.getCount();
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const entries = await qb.getMany();
    return { entries, total };
  }
}
