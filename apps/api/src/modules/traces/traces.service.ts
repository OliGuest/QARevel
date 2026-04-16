import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTrace } from '../../database/entities';
import { ApiTraceDto } from './dto/trace.dto';

@Injectable()
export class TracesService {
  constructor(
    @InjectRepository(ApiTrace)
    private readonly traceRepo: Repository<ApiTrace>,
  ) {}

  async ingestBatch(traces: ApiTraceDto[]): Promise<{ inserted: number }> {
    const entities = traces.map((t) =>
      this.traceRepo.create({
        testRunId: t.testRunId || null,
        testStepResultId: t.testStepResultId || null,
        correlationId: t.correlationId,
        method: t.method,
        url: t.url,
        requestHeaders: t.requestHeaders || null,
        requestBody: t.requestBody || null,
        statusCode: t.statusCode || null,
        responseHeaders: t.responseHeaders || null,
        responseBody: t.responseBody || null,
        responseTimeMs: t.responseTimeMs || null,
        error: t.error || null,
        capturedAt: t.capturedAt ? new Date(t.capturedAt) : new Date(),
      }),
    );

    await this.traceRepo.save(entities);
    return { inserted: entities.length };
  }

  async query(filters: {
    correlationId?: string;
    testRunId?: string;
    method?: string;
    statusCode?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ traces: ApiTrace[]; total: number }> {
    const qb = this.traceRepo.createQueryBuilder('trace');

    if (filters.correlationId) {
      qb.andWhere('trace.correlation_id = :cid', { cid: filters.correlationId });
    }
    if (filters.testRunId) {
      qb.andWhere('trace.test_run_id = :trid', { trid: filters.testRunId });
    }
    if (filters.method) {
      qb.andWhere('trace.method = :method', { method: filters.method });
    }
    if (filters.statusCode) {
      qb.andWhere('trace.status_code = :sc', { sc: filters.statusCode });
    }

    qb.orderBy('trace.captured_at', 'DESC');

    const total = await qb.getCount();
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    qb.skip(offset).take(limit);

    const traces = await qb.getMany();
    return { traces, total };
  }
}
