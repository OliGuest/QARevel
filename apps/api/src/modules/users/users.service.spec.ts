import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from '../../database/entities';

describe('UsersService', () => {
  let service: UsersService;
  let repo: any;

  const existingUser = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'tester',
    isActive: true,
    passwordHash: 'hashed',
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      // create echoes the entity back (mirrors TypeORM's behaviour)
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ id: 'new-id', ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      repo.findOne.mockResolvedValue(existingUser);
      await expect(service.findById('user-1')).resolves.toEqual(existingUser);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('rejects a duplicate email with ConflictException', async () => {
      repo.findOne.mockResolvedValue(existingUser); // findByEmail hit
      await expect(
        service.create({
          email: 'test@example.com',
          password: 'secret123',
          displayName: 'Dupe',
        } as any),
      ).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('hashes the password and never stores plaintext', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.create({
        email: 'new@example.com',
        password: 'secret123',
        displayName: 'New User',
      } as any);

      const savedArg = repo.save.mock.calls[0][0];
      expect(savedArg.passwordHash).toBeDefined();
      expect(savedArg.passwordHash).not.toBe('secret123');
      // The stored hash must actually verify against the original password.
      await expect(bcrypt.compare('secret123', savedArg.passwordHash)).resolves.toBe(true);
      expect(result.email).toBe('new@example.com');
    });

    it('defaults the role to "tester" when not provided', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.create({
        email: 'new@example.com',
        password: 'secret123',
        displayName: 'New User',
      } as any);
      expect(repo.save.mock.calls[0][0].role).toBe('tester');
    });
  });

  describe('update', () => {
    it('applies only the provided fields', async () => {
      repo.findOne.mockResolvedValue({ ...existingUser });
      await service.update('user-1', { displayName: 'Renamed' } as any);
      const saved = repo.save.mock.calls[0][0];
      expect(saved.displayName).toBe('Renamed');
      expect(saved.email).toBe('test@example.com'); // untouched
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      repo.findOne.mockResolvedValue({ ...existingUser });
      const result = await service.deactivate('user-1');
      expect(result.isActive).toBe(false);
    });
  });
});
