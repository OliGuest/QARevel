import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  platform: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'os_version' })
  osVersion: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true, name: 'serial_number' })
  serialNumber: string | null;

  @Column({ type: 'inet', nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'agent_version' })
  agentVersion: string | null;

  @Column({ type: 'varchar', length: 20, default: 'offline' })
  status: string;

  @Column({ type: 'jsonb', default: '{}' })
  capabilities: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_heartbeat' })
  lastHeartbeat: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'registered_by' })
  registeredById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'registered_by' })
  registeredBy: User | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
