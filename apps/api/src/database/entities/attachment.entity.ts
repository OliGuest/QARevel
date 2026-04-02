import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';
import { TestStepResult } from './test-step-result.entity';
import { User } from './user.entity';

@Entity('attachments')
export class Attachment {
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

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 500, name: 'storage_key' })
  storageKey: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'mime_type' })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true, name: 'size_bytes' })
  sizeBytes: number | null;

  @Column({ type: 'uuid', nullable: true, name: 'uploaded_by' })
  uploadedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
