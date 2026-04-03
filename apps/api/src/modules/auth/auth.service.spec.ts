import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../../database/entities';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: any;
  let mockJwtService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'admin',
    isActive: true,
    passwordHash: '',
    lastLoginAt: null,
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 12);

    mockUserRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.validateUser('test@example.com', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.validateUser('wrong@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, isActive: false });
      await expect(
        service.validateUser('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const result = await service.login(mockUser as any);
      expect(result).toHaveProperty('accessToken', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-token');
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'admin',
      });
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ lastLoginAt: expect.any(Date) }));
    });
  });

  describe('refreshToken', () => {
    it('should return new access token for valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'refresh' });
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.refreshToken('valid-refresh-token');
      expect(result).toHaveProperty('accessToken', 'mock-token');
    });

    it('should throw for non-refresh token type', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1', type: 'access' });
      await expect(service.refreshToken('access-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for expired token', async () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      await expect(service.refreshToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
