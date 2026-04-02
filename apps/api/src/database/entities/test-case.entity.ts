import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AppTarget } from './app-target.entity';
import { TestStep } from './test-step.entity';

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'app_target_id' })
  appTargetId: string | null;

  @ManyToOne(() => AppTarget, { nullable: true })
  @JoinColumn({ name: 'app_target_id' })
  appTarget: AppTarget | null;

  @Column({ type: 'varchar', length: 20 })
  platform: string;

  @Column({ type: 'varchar', length: 10, default: 'medium' })
  priority: string;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  type: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  preconditions: string | null;

  @Column({ type: 'text', nullable: true, name: 'automation_code' })
  automationCode: string | null;

  @Column({ type: 'int', nullable: true, name: 'estimated_duration_sec' })
  estimatedDurationSec: number | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @OneToMany(() => TestStep, (step) => step.testCase, { cascade: true })
  steps: TestStep[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
