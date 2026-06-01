import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DeviceProfilesService } from './device-profiles.service';
import { DeviceProfile } from '../../database/entities';

describe('DeviceProfilesService', () => {
  let service: DeviceProfilesService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      count: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => (Array.isArray(data) ? data.map((d) => ({ ...d })) : { ...data })),
      save: jest.fn((e) => Promise.resolve(Array.isArray(e) ? e : { id: 'p-1', ...e })),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceProfilesService,
        { provide: getRepositoryToken(DeviceProfile), useValue: repo },
      ],
    }).compile();
    service = module.get(DeviceProfilesService);
  });

  describe('onModuleInit', () => {
    it('seeds the built-in profiles when the table is empty', async () => {
      repo.count.mockResolvedValue(0);
      await service.onModuleInit();
      const seeded = repo.save.mock.calls[0][0];
      expect(seeded).toHaveLength(6);
      expect(seeded.every((p: any) => p.isSystem)).toBe(true);
      expect(seeded.map((p: any) => p.key)).toContain('web-desktop');
    });

    it('does not seed when profiles already exist', async () => {
      repo.count.mockResolvedValue(6);
      await service.onModuleInit();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('slugifies the label into a key and defaults the icon by platform', async () => {
      repo.findOne.mockResolvedValue(null); // key is free
      await service.create({ label: 'Kiosk Landscape!', platform: 'android', width: 1280, height: 800 } as any, 'user-1');
      const saved = repo.save.mock.calls[0][0];
      expect(saved.key).toBe('kiosk-landscape');
      expect(saved.platform).toBe('android');
      expect(saved.widthPx).toBe(1280);
      expect(saved.heightPx).toBe(800);
      expect(saved.icon).toBe('smartphone'); // android default
      expect(saved.isSystem).toBe(false);
      expect(saved.createdById).toBe('user-1');
    });

    it('appends a suffix when the slug already exists', async () => {
      // First lookup finds a collision, second is free.
      repo.findOne.mockResolvedValueOnce({ id: 'existing' }).mockResolvedValueOnce(null);
      await service.create({ label: 'Desktop', platform: 'web', width: 1920, height: 1080 } as any, 'u');
      expect(repo.save.mock.calls[0][0].key).toBe('desktop-2');
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when the profile is missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
    });

    it('removes an existing profile', async () => {
      const profile = { id: 'p-1', key: 'web-desktop' };
      repo.findOne.mockResolvedValue(profile);
      await service.delete('p-1');
      expect(repo.remove).toHaveBeenCalledWith(profile);
    });
  });
});
