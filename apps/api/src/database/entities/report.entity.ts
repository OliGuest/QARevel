import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';
import { User } from './user.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'test_run_id' })
  testRunId: string;

  @ManyToOne(() => TestRun)
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun;

  @Column({ type: 'varchar', length: 20, default: 'standard' })
  type: string;

  @Column({ type: 'varchar', length: 20, default: 'generating' })
  status: string;

  @Column({ type: 'jsonb' })
  summary: Record<string, unknown>;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'storage_key' })
  storageKey: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'generated_by' })
  generatedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'generated_by' })
  generatedBy: User | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
