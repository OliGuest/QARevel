import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';
import { Device } from './device.entity';

@Entity('log_entries')
export class LogEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'test_run_id' })
  testRunId: string | null;

  @ManyToOne(() => TestRun, { nullable: true })
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun | null;

  @Column({ type: 'varchar', length: 50, name: 'correlation_id' })
  correlationId: string;

  @Column({ type: 'varchar', length: 50 })
  source: string;

  @Column({ type: 'varchar', length: 10 })
  level: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true, name: 'device_id' })
  deviceId: string | null;

  @ManyToOne(() => Device, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: Device | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;
}
