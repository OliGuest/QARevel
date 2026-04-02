import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppTarget } from '../../database/entities';
import { CreateAppTargetDto, UpdateAppTargetDto } from './dto/app-target.dto';

@Injectable()
export class AppTargetsService {
  constructor(
    @InjectRepository(AppTarget)
    private readonly appTargetRepository: Repository<AppTarget>,
  ) {}

  async findAll(): Promise<AppTarget[]> {
    return this.appTargetRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<AppTarget> {
    const target = await this.appTargetRepository.findOne({ where: { id } });
    if (!target) {
      throw new NotFoundException(`AppTarget ${id} not found`);
    }
    return target;
  }

  async create(dto: CreateAppTargetDto, userId: string): Promise<AppTarget> {
    const target = this.appTargetRepository.create({
      name: dto.name,
      platform: dto.platform,
      packageName: dto.packageName || null,
      executablePath: dto.executablePath || null,
      urlPattern: dto.urlPattern || null,
      version: dto.version || null,
      config: dto.config || {},
      createdById: userId,
    });
    return this.appTargetRepository.save(target);
  }

  async update(id: string, dto: UpdateAppTargetDto): Promise<AppTarget> {
    const target = await this.findById(id);

    if (dto.name !== undefined) target.name = dto.name;
    if (dto.platform !== undefined) target.platform = dto.platform;
    if (dto.packageName !== undefined) target.packageName = dto.packageName;
    if (dto.executablePath !== undefined) target.executablePath = dto.executablePath;
    if (dto.urlPattern !== undefined) target.urlPattern = dto.urlPattern;
    if (dto.version !== undefined) target.version = dto.version;
    if (dto.apkStorageKey !== undefined) target.apkStorageKey = dto.apkStorageKey;
    if (dto.config !== undefined) target.config = dto.config;

    return this.appTargetRepository.save(target);
  }

  async delete(id: string): Promise<void> {
    const target = await this.findById(id);
    await this.appTargetRepository.remove(target);
  }
}
