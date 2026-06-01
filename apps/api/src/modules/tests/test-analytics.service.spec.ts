import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TestAnalyticsService } from './test-analytics.service';
import { TestRun } from '../../database/entities';

// Build a TestRun-like object. Runs are returned newest-first (DESC).
function run(status: string, durationMs: number | null = 1000): any {
  return { id: 'r', status, durationMs, createdAt: new Date('2026-01-01') };
}

describe('TestAnalyticsService', () => {
  let service: TestAnalyticsService;
  let repo: any;

  async function analyticsFor(runs: any[]) {
    repo.find.mockResolvedValue(runs);
    return service.getAnalytics('tc-1');
  }

  beforeEach(async () => {
    repo = { find: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestAnalyticsService,
        { provide: getRepositoryToken(TestRun), useValue: repo },
      ],
    }).compile();
    service = module.get<TestAnalyticsService>(TestAnalyticsService);
  });

  it('returns zeroed analytics with no runs', async () => {
    const a = await analyticsFor([]);
    expect(a.totalRuns).toBe(0);
    expect(a.passRate).toBe(0);
    expect(a.failureRate).toBe(0);
    expect(a.flakinessScore).toBe(0);
    expect(a.isFlakyCandidate).toBe(false);
    expect(a.avgDurationMs).toBeNull();
    expect(a.durationTrend).toBe('insufficient_data');
  });

  it('ignores non-terminal runs (e.g. running/queued)', async () => {
    const a = await analyticsFor([run('passed'), run('running'), run('queued')]);
    expect(a.totalRuns).toBe(1);
    expect(a.passed).toBe(1);
  });

  it('scores a fully-passing test as non-flaky', async () => {
    const a = await analyticsFor([run('passed'), run('passed'), run('passed')]);
    expect(a.passRate).toBe(100);
    expect(a.failureRate).toBe(0);
    expect(a.flakinessScore).toBe(0);
    expect(a.isFlakyCandidate).toBe(false);
  });

  it('scores a fully-failing test as non-flaky', async () => {
    const a = await analyticsFor([run('failed'), run('failed'), run('failed')]);
    expect(a.failureRate).toBe(100);
    expect(a.flakinessScore).toBe(0);
    expect(a.isFlakyCandidate).toBe(false); // failureRate not < 80
  });

  it('flags a 50/50 pass-fail split as maximally flaky', async () => {
    const runs = [...Array(5)].map(() => run('passed')).concat([...Array(5)].map(() => run('failed')));
    const a = await analyticsFor(runs);
    expect(a.passRate).toBe(50);
    expect(a.failureRate).toBe(50);
    expect(a.flakinessScore).toBe(100); // entropy peaks at 50/50
    expect(a.isFlakyCandidate).toBe(true);
  });

  it('treats "error" status as a failure for rate purposes', async () => {
    const a = await analyticsFor([run('passed'), run('passed'), run('error'), run('error')]);
    expect(a.failed).toBe(0);
    expect(a.error).toBe(2);
    expect(a.failureRate).toBe(50);
  });

  it('computes duration min/max/avg over terminal runs', async () => {
    const a = await analyticsFor([run('passed', 100), run('passed', 200), run('passed', 300)]);
    expect(a.minDurationMs).toBe(100);
    expect(a.maxDurationMs).toBe(300);
    expect(a.avgDurationMs).toBe(200);
  });

  it('detects a degrading duration trend (recent slower than older)', async () => {
    // newest-first: recent half = 200s, older half = 100s -> +100% -> degrading
    const runs = [run('passed', 200), run('passed', 200), run('passed', 200), run('passed', 100), run('passed', 100), run('passed', 100)];
    const a = await analyticsFor(runs);
    expect(a.durationTrend).toBe('degrading');
  });

  it('detects an improving duration trend (recent faster than older)', async () => {
    const runs = [run('passed', 100), run('passed', 100), run('passed', 100), run('passed', 200), run('passed', 200), run('passed', 200)];
    const a = await analyticsFor(runs);
    expect(a.durationTrend).toBe('improving');
  });

  it('reports a stable trend when durations barely change', async () => {
    const runs = [...Array(6)].map(() => run('passed', 1000));
    const a = await analyticsFor(runs);
    expect(a.durationTrend).toBe('stable');
  });
});
