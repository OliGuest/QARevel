import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('device_profiles')
export class DeviceProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Stable slug used by the runner to resolve a viewport (e.g. "web-desktop").
  @Column({ type: 'varchar', length: 60, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 60 })
  label: string;

  // 'web' | 'android'
  @Column({ type: 'varchar', length: 20 })
  platform: string;

  @Column({ type: 'int', name: 'width_px' })
  widthPx: number;

  @Column({ type: 'int', name: 'height_px' })
  heightPx: number;

  // lucide icon name (e.g. "monitor", "smartphone"); resolved on the client.
  @Column({ type: 'varchar', length: 40, nullable: true })
  icon: string | null;

  // Built-in profiles seeded on first boot.
  @Column({ type: 'boolean', default: false, name: 'is_system' })
  isSystem: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdById: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
