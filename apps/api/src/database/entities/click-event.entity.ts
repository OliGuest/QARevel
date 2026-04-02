import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';
import { TestStepResult } from './test-step-result.entity';
import { Device } from './device.entity';

@Entity('click_events')
export class ClickEvent {
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

  @Column({ type: 'varchar', length: 30, name: 'event_type' })
  eventType: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'target_element' })
  targetElement: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'target_text' })
  targetText: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'screen_name' })
  screenName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  coordinates: { x: number; y: number } | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'input_value' })
  inputValue: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'device_id' })
  deviceId: string | null;

  @ManyToOne(() => Device, { nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: Device | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;
}
