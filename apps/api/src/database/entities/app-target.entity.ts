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

@Entity('app_targets')
export class AppTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  platform: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'package_name' })
  packageName: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'executable_path' })
  executablePath: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'url_pattern' })
  urlPattern: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  version: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'apk_storage_key' })
  apkStorageKey: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
