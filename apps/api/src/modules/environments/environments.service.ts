import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Environment } from '../../database/entities';
import { CreateEnvironmentDto, UpdateEnvironmentDto } from './dto/environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(Environment)
    private readonly envRepository: Repository<Environment>,
  ) {}

  async findAll(): Promise<Environment[]> {
    return this.envRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Environment> {
    const env = await this.envRepository.findOne({ where: { id } });
    if (!env) {
      throw new NotFoundException(`Environment ${id} not found`);
    }
    return env;
  }

  async create(dto: CreateEnvironmentDto, userId: string): Promise<Environment> {
    const env = this.envRepository.create({
      name: dto.name,
      type: dto.type,
      baseUrl: dto.baseUrl,
      description: dto.description || null,
      healthCheckUrl: dto.healthCheckUrl || null,
      authConfig: dto.authConfig || {},
      createdById: userId,
    });
    return this.envRepository.save(env);
  }

  async update(id: string, dto: UpdateEnvironmentDto): Promise<Environment> {
    const env = await this.findById(id);

    if (dto.name !== undefined) env.name = dto.name;
    if (dto.type !== undefined) env.type = dto.type;
    if (dto.baseUrl !== undefined) env.baseUrl = dto.baseUrl;
    if (dto.description !== undefined) env.description = dto.description;
    if (dto.healthCheckUrl !== undefined) env.healthCheckUrl = dto.healthCheckUrl;
    if (dto.authConfig !== undefined) env.authConfig = dto.authConfig;
    if (dto.isActive !== undefined) env.isActive = dto.isActive;

    return this.envRepository.save(env);
  }

  async delete(id: string): Promise<void> {
    const env = await this.findById(id);
    env.isActive = false;
    await this.envRepository.save(env);
  }

  async healthCheck(id: string): Promise<{ healthy: boolean; responseTimeMs: number }> {
    const env = await this.findById(id);
    const url = env.healthCheckUrl || env.baseUrl;

    const start = Date.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });
      const responseTimeMs = Date.now() - start;
      return {
        healthy: response.ok,
        responseTimeMs,
      };
    } catch {
      const responseTimeMs = Date.now() - start;
      return {
        healthy: false,
        responseTimeMs,
      };
    }
  }
}
