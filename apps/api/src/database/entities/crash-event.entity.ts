import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';
import { Device } from './device.entity';
import { User } from './user.entity';

@Entity('crash_events')
export class CrashEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'test_run_id' })
  testRunId: string | null;

  @ManyToOne(() => TestRun, { nullable: true })
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun | null;

  @Column({ type: 'varchar', length: 50, name: 'correlation_id' })
  correlationId: string;

  @Column({ type: 'uuid', nullable: true, name: 'device_id' })
  deviceId: string | null;

  @ManyToOne(() => Device, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: Device | null;

  @Column({ type: 'varchar', length: 10 })
  severity: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  type: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true, name: 'stack_trace' })
  stackTrace: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'last_actions' })
  lastActions: Record<string, unknown>[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'last_api_calls' })
  lastApiCalls: Record<string, unknown>[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'device_state' })
  deviceState: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'screenshot_key' })
  screenshotKey: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_resolved' })
  isResolved: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'resolved_by' })
  resolvedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()', name: 'occurred_at' })
  occurredAt: Date;
}
