import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';
import { TestStep } from './test-step.entity';

@Entity('test_step_results')
export class TestStepResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'test_run_id' })
  testRunId: string;

  @ManyToOne(() => TestRun, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun;

  @Column({ type: 'uuid', nullable: true, name: 'test_step_id' })
  testStepId: string | null;

  @ManyToOne(() => TestStep, { nullable: true })
  @JoinColumn({ name: 'test_step_id' })
  testStep: TestStep | null;

  @Column({ type: 'int', name: 'step_number' })
  stepNumber: number;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'text', nullable: true, name: 'actual_result' })
  actualResult: string | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'screenshot_key' })
  screenshotKey: string | null;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()', name: 'executed_at' })
  executedAt: Date;
}
