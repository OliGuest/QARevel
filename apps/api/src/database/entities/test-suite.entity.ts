import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AppTarget } from './app-target.entity';
import { TestCase } from './test-case.entity';

@Entity('test_suites')
export class TestSuite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'app_target_id' })
  appTargetId: string | null;

  @ManyToOne(() => AppTarget, { nullable: true })
  @JoinColumn({ name: 'app_target_id' })
  appTarget: AppTarget | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @ManyToMany(() => TestCase)
  @JoinTable({
    name: 'test_suite_cases',
    joinColumn: { name: 'suite_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'test_case_id', referencedColumnName: 'id' },
  })
  testCases: TestCase[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
