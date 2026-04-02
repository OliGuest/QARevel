const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3000';

export interface ReportJobData {
  testRunId: string;
  correlationId: string;
  generatedBy?: string;
}

export interface ReportSummary {
  testRunId: string;
  correlationId: string;
  status: string;
  totalSteps: number;
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  durationMs: number;
  startedAt: string | null;
  completedAt: string | null;
  errors: Array<{
    stepNumber: number;
    errorMessage: string;
    screenshotKey?: string;
  }>;
  apiSummary: {
    totalRequests: number;
    avgResponseTimeMs: number;
    errorCount: number;
    statusCodes: Record<string, number>;
  };
  crashEvents: number;
  performance: {
    p50ResponseTimeMs: number;
    p95ResponseTimeMs: number;
    p99ResponseTimeMs: number;
  };
}

export class ReportGenerator {
  async generate(jobData: ReportJobData): Promise<string> {
    const { testRunId, correlationId, generatedBy } = jobData;

    console.log(`[ReportGenerator] Generating report for test run ${testRunId}`);

    // Fetch test run data
    const testRun = await this.fetchJson(`/api/test-runs/${testRunId}`);
    if (!testRun) {
      throw new Error(`Test run ${testRunId} not found`);
    }

    // Fetch all related data in parallel
    const [stepResults, logEntries, apiTraces, crashEvents] = await Promise.all([
      this.fetchJson(`/api/test-runs/${testRunId}/step-results`),
      this.fetchJson(`/api/logs?correlation_id=${correlationId}`),
      this.fetchJson(`/api/api-traces?correlation_id=${correlationId}`),
      this.fetchJson(`/api/crash-events?correlation_id=${correlationId}`),
    ]);

    const results = Array.isArray(stepResults) ? stepResults : [];
    const traces = Array.isArray(apiTraces) ? apiTraces : [];
    const crashes = Array.isArray(crashEvents) ? crashEvents : [];

    // Build error list from failed steps
    const errors = results
      .filter((r: Record<string, unknown>) => r.status === 'failed' || r.status === 'error')
      .map((r: Record<string, unknown>) => ({
        stepNumber: r.step_number as number,
        errorMessage: (r.error_message as string) || 'Unknown error',
        screenshotKey: r.screenshot_key as string | undefined,
      }));

    // Compute API trace summary
    const responseTimes = traces
      .map((t: Record<string, unknown>) => t.response_time_ms as number)
      .filter((ms: number) => typeof ms === 'number' && !isNaN(ms));

    const statusCodes: Record<string, number> = {};
    for (const trace of traces) {
      const code = String((trace as Record<string, unknown>).status_code || 'unknown');
      statusCodes[code] = (statusCodes[code] || 0) + 1;
    }

    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const percentile = (arr: number[], p: number): number => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, idx)];
    };

    const apiSummary = {
      totalRequests: traces.length,
      avgResponseTimeMs: responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
        : 0,
      errorCount: traces.filter((t: Record<string, unknown>) => {
        const code = t.status_code as number;
        return code >= 400;
      }).length,
      statusCodes,
    };

    const performance = {
      p50ResponseTimeMs: percentile(sortedTimes, 50),
      p95ResponseTimeMs: percentile(sortedTimes, 95),
      p99ResponseTimeMs: percentile(sortedTimes, 99),
    };

    const passed = results.filter((r: Record<string, unknown>) => r.status === 'passed').length;
    const failed = results.filter((r: Record<string, unknown>) => r.status === 'failed').length;
    const skipped = results.filter((r: Record<string, unknown>) => r.status === 'skipped').length;
    const errored = results.filter((r: Record<string, unknown>) => r.status === 'error').length;

    const summary: ReportSummary = {
      testRunId,
      correlationId,
      status: (testRun as any).status,
      totalSteps: results.length,
      passed,
      failed,
      skipped,
      errored,
      durationMs: (testRun as any).duration_ms || 0,
      startedAt: (testRun as any).started_at || null,
      completedAt: (testRun as any).completed_at || null,
      errors,
      apiSummary,
      crashEvents: crashes.length,
      performance,
    };

    // Save report via API
    const reportResponse = await fetch(`${API_INTERNAL_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_run_id: testRunId,
        type: 'standard',
        status: 'ready',
        summary,
        generated_by: generatedBy,
      }),
    });

    if (!reportResponse.ok) {
      throw new Error(`Failed to save report: ${reportResponse.status} ${reportResponse.statusText}`);
    }

    const report = (await reportResponse.json()) as { id: string };
    const reportId = report.id;

    console.log(`[ReportGenerator] Report ${reportId} generated for test run ${testRunId}`);
    return reportId;
  }

  private async fetchJson(path: string): Promise<unknown> {
    try {
      const response = await fetch(`${API_INTERNAL_URL}${path}`);
      if (!response.ok) {
        console.warn(`[ReportGenerator] Failed to fetch ${path}: ${response.status}`);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.warn(`[ReportGenerator] Error fetching ${path}:`, err);
      return null;
    }
  }
}
