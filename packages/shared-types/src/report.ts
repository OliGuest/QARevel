export enum ReportStatus {
  GENERATING = 'GENERATING',
  READY = 'READY',
  ERROR = 'ERROR',
}

export enum ReportType {
  STANDARD = 'STANDARD',
  LOAD_TEST = 'LOAD_TEST',
  COMPARISON = 'COMPARISON',
}

export interface Report {
  id: string;
  testRunId: string;
  type: ReportType;
  status: ReportStatus;
  summary: Record<string, any>;
  storageKey?: string;
  generatedBy?: string;
  createdAt: string;
}

export interface ReportSummary {
  title: string;
  status: string;
  durationMs: number;
  totalSteps: number;
  passed: number;
  failed: number;
  skipped: number;
  errorRate: string;
}
