import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Device } from '../../database/entities';
import { RegisterDeviceDto, UpdateDeviceDto, HeartbeatDto } from './dto/device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(filters?: { platform?: string; status?: string }): Promise<Device[]> {
    const qb = this.deviceRepository.createQueryBuilder('device');

    if (filters?.platform) {
      qb.andWhere('device.platform = :platform', { platform: filters.platform });
    }
    if (filters?.status) {
      qb.andWhere('device.status = :status', { status: filters.status });
    }

    qb.orderBy('device.created_at', 'DESC');
    return qb.getMany();
  }

  async findById(id: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['registeredBy'],
    });
    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }
    return device;
  }

  async register(dto: RegisterDeviceDto, userId: string) {
    const device = this.deviceRepository.create({
      name: dto.name,
      platform: dto.platform,
      osVersion: dto.osVersion || null,
      model: dto.model || null,
      serialNumber: dto.serialNumber || null,
      ipAddress: dto.ipAddress || null,
      capabilities: dto.capabilities || {},
      registeredById: userId,
      status: 'offline',
    });

    const saved = await this.deviceRepository.save(device);

    // Generate a long-lived agent token scoped to this device
    const agentToken = this.jwtService.sign(
      {
        sub: saved.id,
        type: 'device_agent',
        deviceId: saved.id,
      },
      { expiresIn: '365d' },
    );

    return { device: saved, agentToken };
  }

  async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findById(id);

    if (dto.name !== undefined) device.name = dto.name;
    if (dto.osVersion !== undefined) device.osVersion = dto.osVersion;
    if (dto.model !== undefined) device.model = dto.model;
    if (dto.ipAddress !== undefined) device.ipAddress = dto.ipAddress;
    if (dto.agentVersion !== undefined) device.agentVersion = dto.agentVersion;
    if (dto.capabilities !== undefined) device.capabilities = dto.capabilities;

    return this.deviceRepository.save(device);
  }

  async delete(id: string): Promise<void> {
    const device = await this.findById(id);
    await this.deviceRepository.remove(device);
  }

  async heartbeat(id: string, dto: HeartbeatDto): Promise<Device> {
    const device = await this.findById(id);
    device.status = dto.status;
    device.lastHeartbeat = new Date();

    if (dto.metrics) {
      device.capabilities = {
        ...device.capabilities,
        lastMetrics: dto.metrics,
      };
    }

    return this.deviceRepository.save(device);
  }
}
