import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Device } from './device.entity';
import { Environment } from './environment.entity';
import { AppTarget } from './app-target.entity';
import { TestSuite } from './test-suite.entity';
import { TestCase } from './test-case.entity';

@Entity('test_runs')
export class TestRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'suite_id' })
  suiteId: string | null;

  @ManyToOne(() => TestSuite, { nullable: true })
  @JoinColumn({ name: 'suite_id' })
  suite: TestSuite | null;

  @Column({ type: 'uuid', nullable: true, name: 'test_case_id' })
  testCaseId: string | null;

  @ManyToOne(() => TestCase, { nullable: true })
  @JoinColumn({ name: 'test_case_id' })
  testCase: TestCase | null;

  @Column({ type: 'uuid', nullable: true, name: 'device_id' })
  deviceId: string | null;

  @ManyToOne(() => Device, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: Device | null;

  @Column({ type: 'uuid', name: 'environment_id' })
  environmentId: string;

  @ManyToOne(() => Environment)
  @JoinColumn({ name: 'environment_id' })
  environment: Environment;

  @Column({ type: 'uuid', nullable: true, name: 'app_target_id' })
  appTargetId: string | null;

  @ManyToOne(() => AppTarget, { nullable: true })
  @JoinColumn({ name: 'app_target_id' })
  appTarget: AppTarget | null;

  @Column({ type: 'uuid', name: 'triggered_by' })
  triggeredById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'triggered_by' })
  triggeredBy: User;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 50, unique: true, name: 'correlation_id' })
  correlationId: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs: number | null;

  @Column({ type: 'jsonb', nullable: true })
  summary: Record<string, unknown> | null;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
