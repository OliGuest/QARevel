import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { TestRun, RecordingEvent, Environment } from '../../database/entities';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(TestRun)
    private readonly testRunRepo: Repository<TestRun>,
    @InjectRepository(RecordingEvent)
    private readonly recordingEventRepo: Repository<RecordingEvent>,
    @InjectRepository(Environment)
    private readonly environmentRepo: Repository<Environment>,
    @InjectQueue('test-execution')
    private readonly testQueue: Queue,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  async startRecording(
    environmentId: string,
    userId: string,
  ): Promise<{ id: string; correlationId: string; status: string; wsChannel: string }> {
    const environment = await this.environmentRepo.findOne({
      where: { id: environmentId },
    });
    if (!environment) {
      throw new NotFoundException(`Environment ${environmentId} not found`);
    }

    const now = new Date();
    const correlationId = `rec-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 8)}`;

    const run = this.testRunRepo.create({
      suiteId: null,
      testCaseId: null,
      deviceId: null,
      environmentId,
      appTargetId: null,
      triggeredById: userId,
      type: 'recording',
      status: 'pending',
      correlationId,
      config: {},
      startedAt: now,
    });

    const saved = await this.testRunRepo.save(run);

    try {
      const jobData = {
        testRunId: saved.id,
        correlationId,
        environmentBaseUrl: environment.baseUrl,
        executorType: 'recording',
        config: {},
        envVars: {},
      };

      await this.testQueue.add('execute', jobData, { jobId: saved.id });
      this.logger.log(`Enqueued recording job for run ${saved.id}`);
    } catch (err) {
      this.logger.error(
        `Failed to enqueue recording job for run ${saved.id}: ${(err as Error).message}`,
      );
    }

    return {
      id: saved.id,
      correlationId: saved.correlationId,
      status: saved.status,
      wsChannel: `test-run:${saved.id}`,
    };
  }

  async stopRecording(id: string): Promise<TestRun> {
    const run = await this.testRunRepo.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`Recording ${id} not found`);

    await this.redis.set(`recording:stop:${id}`, '1', 'EX', 60);

    run.status = 'stopping';
    return this.testRunRepo.save(run);
  }

  async addEvents(
    recordingId: string,
    events: { type: string; timestamp: string; data: Record<string, unknown> }[],
  ): Promise<number> {
    const entities = events.map((e) =>
      this.recordingEventRepo.create({
        recordingId,
        type: e.type,
        timestamp: new Date(e.timestamp),
        data: e.data,
      }),
    );

    const saved = await this.recordingEventRepo.save(entities);
    return saved.length;
  }

  async getRecordingStatus(id: string): Promise<{ status: string }> {
    const run = await this.testRunRepo.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`Recording ${id} not found`);
    return { status: run.status };
  }

  async listRecordings(): Promise<TestRun[]> {
    return this.testRunRepo.find({
      where: { type: 'recording' },
      relations: ['environment'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRecording(id: string): Promise<TestRun> {
    const run = await this.testRunRepo.findOne({
      where: { id },
      relations: ['environment'],
    });
    if (!run) throw new NotFoundException(`Recording ${id} not found`);
    return run;
  }

  async getRecordingEvents(
    id: string,
    type?: string,
    limit?: number,
    offset?: number,
  ): Promise<RecordingEvent[]> {
    const qb = this.recordingEventRepo
      .createQueryBuilder('event')
      .where('event.recording_id = :id', { id })
      .orderBy('event.timestamp', 'ASC');

    if (type) {
      qb.andWhere('event.type = :type', { type });
    }
    if (offset) {
      qb.skip(offset);
    }
    if (limit) {
      qb.take(limit);
    }

    return qb.getMany();
  }

  async deleteRecording(id: string): Promise<void> {
    const run = await this.testRunRepo.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`Recording ${id} not found`);

    // Delete events first (cascade may handle this but be explicit)
    await this.recordingEventRepo.delete({ recordingId: id });
    await this.testRunRepo.remove(run);
  }

  async getEventStats(
    recordingId: string,
  ): Promise<Record<string, number>> {
    const counts = await this.recordingEventRepo
      .createQueryBuilder('event')
      .select('event.type', 'type')
      .addSelect('COUNT(*)::int', 'count')
      .where('event.recording_id = :recordingId', { recordingId })
      .groupBy('event.type')
      .getRawMany<{ type: string; count: number }>();

    const statsMap: Record<string, number> = {};
    let totalEvents = 0;
    for (const row of counts) {
      statsMap[row.type] = row.count;
      totalEvents += row.count;
    }

    return {
      totalEvents,
      networkRequests: statsMap['network'] || 0,
      clicks: statsMap['click'] || 0,
      screenshots: statsMap['screenshot'] || 0,
      pagesVisited: statsMap['navigation'] || 0,
    };
  }
}
