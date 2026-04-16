import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { TestRun } from '../../database/entities';

export interface TestCaseAnalytics {
  testCaseId: string;
  totalRuns: number;
  passed: number;
  failed: number;
  error: number;
  cancelled: number;
  passRate: number;
  failureRate: number;
  flakinessScore: number;
  isFlakyCandidate: boolean;
  avgDurationMs: number | null;
  minDurationMs: number | null;
  maxDurationMs: number | null;
  recentRuns: {
    id: string;
    status: string;
    durationMs: number | null;
    createdAt: Date;
  }[];
  durationTrend: 'improving' | 'degrading' | 'stable' | 'insufficient_data';
}

@Injectable()
export class TestAnalyticsService {
  constructor(
    @InjectRepository(TestRun)
    private readonly testRunRepo: Repository<TestRun>,
  ) {}

  async getAnalytics(testCaseId: string, days = 30): Promise<TestCaseAnalytics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const runs = await this.testRunRepo.find({
      where: {
        testCaseId,
        createdAt: MoreThanOrEqual(since),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const terminalRuns = runs.filter((r) =>
      ['passed', 'failed', 'error', 'cancelled'].includes(r.status),
    );

    const passed = terminalRuns.filter((r) => r.status === 'passed').length;
    const failed = terminalRuns.filter((r) => r.status === 'failed').length;
    const error = terminalRuns.filter((r) => r.status === 'error').length;
    const cancelled = terminalRuns.filter((r) => r.status === 'cancelled').length;
    const totalRuns = terminalRuns.length;

    const passRate = totalRuns > 0 ? (passed / totalRuns) * 100 : 0;
    const failureRate = totalRuns > 0 ? ((failed + error) / totalRuns) * 100 : 0;

    // Flakiness score: tests that sometimes pass and sometimes fail
    // High score = very flaky (near 50% pass/fail split)
    // Score = 0 if always passes or always fails
    let flakinessScore = 0;
    if (totalRuns >= 3) {
      const p = passed / totalRuns;
      // Entropy-based: max flakiness at 50/50, 0 at 0% or 100%
      flakinessScore = Math.round(-100 * (p * Math.log2(p || 0.001) + (1 - p) * Math.log2((1 - p) || 0.001)));
      flakinessScore = Math.min(100, Math.max(0, flakinessScore));
    }

    const isFlakyCandidate = totalRuns >= 3 && failureRate > 20 && failureRate < 80;

    // Duration stats
    const durations = terminalRuns
      .map((r) => r.durationMs)
      .filter((d): d is number => d !== null && d !== undefined);

    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;
    const minDurationMs = durations.length > 0 ? Math.min(...durations) : null;
    const maxDurationMs = durations.length > 0 ? Math.max(...durations) : null;

    // Duration trend: compare first half vs second half average
    let durationTrend: TestCaseAnalytics['durationTrend'] = 'insufficient_data';
    if (durations.length >= 6) {
      const half = Math.floor(durations.length / 2);
      // Runs are DESC order, so first half = recent, second half = older
      const recentAvg = durations.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const olderAvg = durations.slice(half).reduce((a, b) => a + b, 0) / (durations.length - half);

      const change = ((recentAvg - olderAvg) / olderAvg) * 100;
      if (change > 15) durationTrend = 'degrading';
      else if (change < -15) durationTrend = 'improving';
      else durationTrend = 'stable';
    }

    const recentRuns = terminalRuns.slice(0, 20).map((r) => ({
      id: r.id,
      status: r.status,
      durationMs: r.durationMs,
      createdAt: r.createdAt,
    }));

    return {
      testCaseId,
      totalRuns,
      passed,
      failed,
      error,
      cancelled,
      passRate: Math.round(passRate * 10) / 10,
      failureRate: Math.round(failureRate * 10) / 10,
      flakinessScore,
      isFlakyCandidate,
      avgDurationMs,
      minDurationMs,
      maxDurationMs,
      recentRuns,
      durationTrend,
    };
  }
}
