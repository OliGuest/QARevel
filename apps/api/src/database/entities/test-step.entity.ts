import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TestCase } from './test-case.entity';

@Entity('test_steps')
@Unique(['testCaseId', 'stepNumber'])
export class TestStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'test_case_id' })
  testCaseId: string;

  @ManyToOne(() => TestCase, (tc) => tc.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_case_id' })
  testCase: TestCase;

  @Column({ type: 'int', name: 'step_number' })
  stepNumber: number;

  @Column({ type: 'text' })
  action: string;

  @Column({ type: 'text', nullable: true, name: 'expected_result' })
  expectedResult: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  selector: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'selector_type' })
  selectorType: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'input_data' })
  inputData: Record<string, unknown> | null;

  @Column({ type: 'int', default: 10000, name: 'timeout_ms' })
  timeoutMs: number;

  @Column({ type: 'boolean', default: false, name: 'is_optional' })
  isOptional: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
