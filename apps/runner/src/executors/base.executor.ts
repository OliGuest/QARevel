import { Client as MinioClient } from 'minio';
import { v4 as uuidv4 } from 'uuid';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3000';
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'qarevel';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'qarevel123';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'qarevel';

export interface StepResult {
  testStepId: string | null;
  stepNumber: number;
  status: 'passed' | 'failed' | 'skipped' | 'blocked' | 'error';
  actualResult?: string;
  errorMessage?: string;
  screenshotKey?: string;
  durationMs?: number;
}

export interface ConsoleError {
  level: string;
  text: string;
  timestamp: number;
  url: string;
}

export interface ErrorFingerprint {
  hash: string;
  message: string;
  source: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  level: string;
}

export interface ExecutionResult {
  testRunId: string;
  status: 'passed' | 'failed' | 'error';
  stepResults: StepResult[];
  durationMs: number;
  consoleErrors?: ConsoleError[];
  errorFingerprints?: ErrorFingerprint[];
}

export interface JobData {
  testRunId: string;
  correlationId: string;
  environmentBaseUrl: string;
  steps: Array<{
    id: string;
    stepNumber: number;
    action: string;
    selector?: string;
    selectorType?: string;
    inputData?: Record<string, unknown>;
    expectedResult?: string;
    timeoutMs?: number;
    isOptional?: boolean;
  }>;
  config?: Record<string, unknown>;
  envVars?: Record<string, string>;
}

export interface ViewportConfig {
  width: number;
  height: number;
}

export interface DeviceProfile {
  platform: 'web' | 'android';
  viewMode: 'desktop' | 'mobile' | 'tablet' | 'kiosk';
  viewport: ViewportConfig;
  userAgent?: string;
  isMobile?: boolean;
  hasTouch?: boolean;
  deviceScaleFactor?: number;
}

export const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  'web-desktop': {
    platform: 'web',
    viewMode: 'desktop',
    viewport: { width: 1920, height: 1080 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  },
  'web-mobile': {
    platform: 'web',
    viewMode: 'mobile',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
  'web-tablet': {
    platform: 'web',
    viewMode: 'tablet',
    viewport: { width: 820, height: 1180 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  'web-kiosk-vertical': {
    platform: 'web',
    viewMode: 'kiosk',
    viewport: { width: 1080, height: 1920 },
    isMobile: false,
    hasTouch: true,
    deviceScaleFactor: 1,
  },
  'android-phone': {
    platform: 'android',
    viewMode: 'mobile',
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625,
  },
  'android-tablet': {
    platform: 'android',
    viewMode: 'tablet',
    viewport: { width: 800, height: 1280 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
};

export function resolveDeviceProfile(config?: Record<string, unknown>): DeviceProfile {
  const profileKey = config?.deviceProfile as string | undefined;
  if (profileKey && DEVICE_PROFILES[profileKey]) {
    const profile = { ...DEVICE_PROFILES[profileKey] };
    // Allow custom viewport override
    if (config?.viewport) {
      profile.viewport = config.viewport as ViewportConfig;
    }
    return profile;
  }
  // Custom viewport without a profile
  if (config?.viewport) {
    return {
      platform: 'web',
      viewMode: 'desktop',
      viewport: config.viewport as ViewportConfig,
      isMobile: false,
      hasTouch: false,
      deviceScaleFactor: 1,
    };
  }
  // Default
  return DEVICE_PROFILES['web-desktop'];
}

export interface RecordingJobData {
  testRunId: string;
  correlationId: string;
  environmentBaseUrl: string;
  executorType: 'recording';
  config?: {
    screenshotInterval?: number;
    batchInterval?: number;
    deviceProfile?: string;
    viewport?: ViewportConfig;
  };
}

export abstract class BaseExecutor {
  protected minioClient: MinioClient;

  constructor() {
    this.minioClient = new MinioClient({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: false,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
  }

  abstract execute(jobData: JobData): Promise<ExecutionResult>;

  protected async uploadScreenshot(buffer: Buffer, testRunId: string): Promise<string> {
    const key = `screenshots/${testRunId}/${uuidv4()}.png`;

    const bucketExists = await this.minioClient.bucketExists(MINIO_BUCKET);
    if (!bucketExists) {
      await this.minioClient.makeBucket(MINIO_BUCKET);
    }

    await this.minioClient.putObject(MINIO_BUCKET, key, buffer, buffer.length, {
      'Content-Type': 'image/png',
    });

    return key;
  }

  protected async sendStepResult(testRunId: string, result: StepResult): Promise<void> {
    const url = `${API_INTERNAL_URL}/api/test-runs/${testRunId}/step-results`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_step_id: result.testStepId,
        step_number: result.stepNumber,
        status: result.status,
        actual_result: result.actualResult,
        error_message: result.errorMessage,
        screenshot_key: result.screenshotKey,
        duration_ms: result.durationMs,
      }),
    });

    if (!response.ok) {
      console.error(`[BaseExecutor] Failed to send step result: ${response.status} ${response.statusText}`);
    }
  }

  protected async updateTestRunStatus(
    testRunId: string,
    status: string,
    summary?: Record<string, unknown>,
  ): Promise<void> {
    const url = `${API_INTERNAL_URL}/api/test-runs/${testRunId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, summary }),
    });

    if (!response.ok) {
      console.error(`[BaseExecutor] Failed to update test run status: ${response.status} ${response.statusText}`);
    }
  }

  protected interpolateValue(value: string, envVars: Record<string, string>): string {
    return value.replace(/\{\{env\.(\w+)\}\}/g, (_match, key) => {
      return envVars[key] ?? `{{env.${key}}}`;
    });
  }
}
