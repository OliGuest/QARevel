import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50, name: 'condition_type' })
  conditionType: string;

  @Column({ type: 'int', default: 3 })
  threshold: number;

  @Column({ type: 'uuid', nullable: true, name: 'test_case_id' })
  testCaseId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'environment_id' })
  environmentId: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_triggered_at' })
  lastTriggeredAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'trigger_count' })
  triggerCount: number;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
