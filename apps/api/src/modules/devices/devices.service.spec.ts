import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Device } from '../../database/entities';

describe('DevicesService', () => {
  let service: DevicesService;
  let repo: any;
  let jwt: any;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ id: 'dev-1', ...entity })),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('agent-token-xyz') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: getRepositoryToken(Device), useValue: repo },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  describe('findById', () => {
    it('throws NotFoundException when the device is missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('register', () => {
    it('creates an offline device and issues a device-scoped agent token', async () => {
      const { device, agentToken } = await service.register(
        { name: 'Pixel 7', platform: 'android' } as any,
        'user-1',
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Pixel 7', platform: 'android', status: 'offline', registeredById: 'user-1' }),
      );
      expect(device.id).toBe('dev-1');
      expect(agentToken).toBe('agent-token-xyz');

      // Token must be scoped to the device with the right type + long TTL.
      const [payload, opts] = jwt.sign.mock.calls[0];
      expect(payload).toMatchObject({ sub: 'dev-1', type: 'device_agent', deviceId: 'dev-1' });
      expect(opts).toEqual({ expiresIn: '365d' });
    });
  });

  describe('heartbeat', () => {
    it('updates status, stamps lastHeartbeat, and merges metrics into capabilities', async () => {
      repo.findOne.mockResolvedValue({ id: 'dev-1', status: 'offline', capabilities: { foo: 'bar' } });
      const result = await service.heartbeat('dev-1', {
        status: 'online',
        metrics: { cpu: 12 },
      } as any);

      expect(result.status).toBe('online');
      expect(result.lastHeartbeat).toBeInstanceOf(Date);
      expect(result.capabilities).toEqual({ foo: 'bar', lastMetrics: { cpu: 12 } });
    });
  });

  describe('findAll', () => {
    it('applies platform and status filters to the query', async () => {
      const qb: any = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ platform: 'android', status: 'online' });

      expect(qb.andWhere).toHaveBeenCalledWith('device.platform = :platform', { platform: 'android' });
      expect(qb.andWhere).toHaveBeenCalledWith('device.status = :status', { status: 'online' });
    });
  });
});
