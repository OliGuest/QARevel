import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceProfile } from '../../database/entities';
import { CreateDeviceProfileDto } from './dto/device-profile.dto';

// The original hardcoded profiles, now seeded as built-ins on first boot.
const DEFAULT_PROFILES: Array<Partial<DeviceProfile>> = [
  { key: 'web-desktop', label: 'Desktop', platform: 'web', widthPx: 1920, heightPx: 1080, icon: 'monitor', sortOrder: 1 },
  { key: 'web-mobile', label: 'Mobile (iOS)', platform: 'web', widthPx: 390, heightPx: 844, icon: 'smartphone', sortOrder: 2 },
  { key: 'web-tablet', label: 'Tablet (iPad)', platform: 'web', widthPx: 820, heightPx: 1180, icon: 'tablet', sortOrder: 3 },
  { key: 'web-kiosk-vertical', label: 'Kiosk Vertical', platform: 'web', widthPx: 1080, heightPx: 1920, icon: 'rectangle-vertical', sortOrder: 4 },
  { key: 'android-phone', label: 'Android Phone', platform: 'android', widthPx: 412, heightPx: 915, icon: 'smartphone', sortOrder: 5 },
  { key: 'android-tablet', label: 'Android Tablet', platform: 'android', widthPx: 800, heightPx: 1280, icon: 'tablet', sortOrder: 6 },
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'profile';
}

@Injectable()
export class DeviceProfilesService implements OnModuleInit {
  private readonly logger = new Logger(DeviceProfilesService.name);

  constructor(
    @InjectRepository(DeviceProfile)
    private readonly repo: Repository<DeviceProfile>,
  ) {}

  // Seed the built-in profiles the first time the table is empty so existing
  // behaviour (the original 6 profiles) is preserved out of the box.
  async onModuleInit(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(
        DEFAULT_PROFILES.map((p) => this.repo.create({ ...p, isSystem: true })),
      );
      this.logger.log(`Seeded ${DEFAULT_PROFILES.length} built-in device profiles`);
    }
  }

  findAll(): Promise<DeviceProfile[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async create(dto: CreateDeviceProfileDto, userId: string): Promise<DeviceProfile> {
    const key = await this.uniqueKey(slugify(dto.label));
    const profile = this.repo.create({
      key,
      label: dto.label,
      platform: dto.platform,
      widthPx: dto.width,
      heightPx: dto.height,
      icon: dto.icon || (dto.platform === 'android' ? 'smartphone' : 'monitor'),
      isSystem: false,
      sortOrder: 100,
      createdById: userId,
    });
    return this.repo.save(profile);
  }

  async delete(id: string): Promise<void> {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Device profile ${id} not found`);
    }
    await this.repo.remove(profile);
  }

  // Append -2, -3, ... until the slug is free.
  private async uniqueKey(base: string): Promise<string> {
    let candidate = base;
    let n = 2;
    while (await this.repo.findOne({ where: { key: candidate } })) {
      candidate = `${base}-${n++}`;
    }
    return candidate;
  }
}
