import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: any;

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return ok when database is healthy', async () => {
    mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('up');
  });

  it('should return degraded when database is down', async () => {
    mockDataSource.query.mockRejectedValue(new Error('connection refused'));
    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe('down');
  });
});
