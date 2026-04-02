import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';
import { TestStepResult } from './test-step-result.entity';

@Entity('api_traces')
export class ApiTrace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'test_run_id' })
  testRunId: string | null;

  @ManyToOne(() => TestRun, { nullable: true })
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun | null;

  @Column({ type: 'uuid', nullable: true, name: 'test_step_result_id' })
  testStepResultId: string | null;

  @ManyToOne(() => TestStepResult, { nullable: true })
  @JoinColumn({ name: 'test_step_result_id' })
  testStepResult: TestStepResult | null;

  @Column({ type: 'varchar', length: 50, name: 'correlation_id' })
  correlationId: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 2000 })
  url: string;

  @Column({ type: 'jsonb', nullable: true, name: 'request_headers' })
  requestHeaders: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'request_body' })
  requestBody: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true, name: 'status_code' })
  statusCode: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'response_headers' })
  responseHeaders: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'response_body' })
  responseBody: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true, name: 'response_time_ms' })
  responseTimeMs: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()', name: 'captured_at' })
  capturedAt: Date;
}
