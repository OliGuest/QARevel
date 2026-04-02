import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TestRun } from './test-run.entity';

@Entity('recording_events')
@Index(['recordingId', 'type'])
@Index(['recordingId', 'timestamp'])
export class RecordingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'recording_id' })
  recordingId: string;

  @ManyToOne(() => TestRun, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recording_id' })
  recording: TestRun;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'jsonb', default: '{}' })
  data: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
