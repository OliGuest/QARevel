import type {
  User,
  LoginResponse,
  Device,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  DeviceHeartbeat,
  Environment,
  CreateEnvironmentRequest,
  HealthCheckResponse,
  AppTarget,
  CreateAppTargetRequest,
  TestCase,
  CreateTestCaseRequest,
  CreateTestStepRequest,
  TestStep,
  TestSuite,
  TestRun,
  StartTestRunRequest,
  StartTestRunResponse,
  TestStepResult,
  Report,
  LogEntry,
} from '@qarevel/shared-types';

interface ApiError {
  message: string;
  statusCode: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('qarevel_access_token');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await this.doFetch(path, options);

    // Try token refresh on 401
    if (response.status === 401 && !path.includes('/auth/')) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retryResponse = await this.doFetch(path, options);
        if (retryResponse.ok) {
          if (retryResponse.status === 204) return undefined as T;
          return retryResponse.json();
        }
      }
      // Refresh failed or retry failed — logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('qarevel_access_token');
        localStorage.removeItem('qarevel_refresh_token');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      throw { message: 'Unauthorized', statusCode: 401 } as ApiError;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw {
        message: body.message || response.statusText,
        statusCode: response.status,
      } as ApiError;
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  private async doFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });
  }

  private refreshPromise: Promise<boolean> | null = null;

  private async tryRefresh(): Promise<boolean> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = typeof window !== 'undefined'
          ? localStorage.getItem('qarevel_refresh_token')
          : null;
        if (!refreshToken) return false;

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) return false;

        const data = await response.json();
        if (data.accessToken) {
          localStorage.setItem('qarevel_access_token', data.accessToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('qarevel_refresh_token')
      : null;
    return this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Devices
  async getDevices(): Promise<Device[]> {
    return this.request<Device[]>('/devices');
  }

  async registerDevice(data: RegisterDeviceRequest): Promise<RegisterDeviceResponse> {
    return this.request<RegisterDeviceResponse>('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDevice(id: string, data: Partial<Device>): Promise<Device> {
    return this.request<Device>(`/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDevice(id: string): Promise<void> {
    return this.request<void>(`/devices/${id}`, { method: 'DELETE' });
  }

  async deviceHeartbeat(id: string, data: DeviceHeartbeat): Promise<void> {
    return this.request<void>(`/devices/${id}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Environments
  async getEnvironments(): Promise<Environment[]> {
    return this.request<Environment[]>('/environments');
  }

  async createEnvironment(data: CreateEnvironmentRequest): Promise<Environment> {
    return this.request<Environment>('/environments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEnvironment(id: string, data: Partial<Environment>): Promise<Environment> {
    return this.request<Environment>(`/environments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEnvironment(id: string): Promise<void> {
    return this.request<void>(`/environments/${id}`, { method: 'DELETE' });
  }

  async checkEnvironment(id: string): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>(`/environments/${id}/health`);
  }

  // App Targets
  async getAppTargets(): Promise<AppTarget[]> {
    return this.request<AppTarget[]>('/app-targets');
  }

  async createAppTarget(data: CreateAppTargetRequest): Promise<AppTarget> {
    return this.request<AppTarget>('/app-targets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppTarget(id: string, data: Partial<AppTarget>): Promise<AppTarget> {
    return this.request<AppTarget>(`/app-targets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAppTarget(id: string): Promise<void> {
    return this.request<void>(`/app-targets/${id}`, { method: 'DELETE' });
  }

  // Test Cases
  async getTestCases(params?: Record<string, string>): Promise<TestCase[]> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<TestCase[]>(`/test-cases${query}`);
  }

  async createTestCase(data: CreateTestCaseRequest): Promise<TestCase> {
    return this.request<TestCase>('/test-cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTestCase(id: string): Promise<TestCase> {
    return this.request<TestCase>(`/test-cases/${id}`);
  }

  async getTestCaseAnalytics(id: string, days = 30): Promise<any> {
    return this.request(`/test-cases/${id}/analytics?days=${days}`);
  }

  async updateTestCase(id: string, data: Partial<TestCase>): Promise<TestCase> {
    return this.request<TestCase>(`/test-cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTestCase(id: string): Promise<void> {
    return this.request<void>(`/test-cases/${id}`, { method: 'DELETE' });
  }

  // Test Steps
  async addTestStep(caseId: string, data: CreateTestStepRequest): Promise<TestStep> {
    return this.request<TestStep>(`/test-cases/${caseId}/steps`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTestStep(caseId: string, stepId: string, data: Partial<TestStep>): Promise<TestStep> {
    return this.request<TestStep>(`/test-cases/${caseId}/steps/${stepId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTestStep(caseId: string, stepId: string): Promise<void> {
    return this.request<void>(`/test-cases/${caseId}/steps/${stepId}`, {
      method: 'DELETE',
    });
  }

  // Test Suites
  async getTestSuites(): Promise<TestSuite[]> {
    return this.request<TestSuite[]>('/test-suites');
  }

  async createTestSuite(data: Partial<TestSuite>): Promise<TestSuite> {
    return this.request<TestSuite>('/test-suites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTestSuite(id: string): Promise<TestSuite> {
    return this.request<TestSuite>(`/test-suites/${id}`);
  }

  async removeCaseFromSuite(suiteId: string, caseId: string): Promise<void> {
    return this.request<void>(`/test-suites/${suiteId}/cases/${caseId}`, {
      method: 'DELETE',
    });
  }

  async addCaseToSuite(suiteId: string, caseId: string, order: number): Promise<void> {
    return this.request<void>(`/test-suites/${suiteId}/cases`, {
      method: 'POST',
      body: JSON.stringify({ testCaseId: caseId, order }),
    });
  }

  // Test Runs
  async startTestRun(data: StartTestRunRequest): Promise<StartTestRunResponse> {
    return this.request<StartTestRunResponse>('/test-runs/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async stopTestRun(id: string): Promise<TestRun> {
    return this.request<TestRun>(`/test-runs/${id}/stop`, {
      method: 'POST',
    });
  }

  async getTestRun(id: string): Promise<TestRun> {
    return this.request<TestRun>(`/test-runs/${id}`);
  }

  async getTestRuns(params?: Record<string, string>): Promise<TestRun[]> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<TestRun[]>(`/test-runs${query}`);
  }

  async getTestRunStepResults(runId: string): Promise<TestStepResult[]> {
    return this.request<TestStepResult[]>(`/test-runs/${runId}/step-results`);
  }

  getScreenshotUrl(key: string): string {
    const token = this.getToken();
    return `${this.baseUrl}/attachments/screenshot?key=${encodeURIComponent(key)}&token=${token}`;
  }

  // Sessions (manual test runs)
  async startSession(data: StartTestRunRequest): Promise<StartTestRunResponse> {
    return this.request<StartTestRunResponse>('/test-runs', {
      method: 'POST',
      body: JSON.stringify({ ...data, type: 'MANUAL' }),
    });
  }

  async addSessionStep(runId: string, data: Partial<TestStepResult>): Promise<TestStepResult> {
    return this.request<TestStepResult>(`/test-runs/${runId}/steps`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeSession(runId: string, data: { status: string; notes?: string }): Promise<TestRun> {
    return this.request<TestRun>(`/test-runs/${runId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Recordings
  async startRecording(data: {
    environmentId: string;
    name?: string;
    deviceProfile?: string;
    viewport?: { width: number; height: number };
    deviceSerial?: string;
  }): Promise<{ id: string; correlationId: string; status: string; wsChannel: string }> {
    return this.request('/recordings/start', { method: 'POST', body: JSON.stringify(data) });
  }

  async stopRecording(id: string): Promise<any> {
    return this.request(`/recordings/${id}/stop`, { method: 'POST' });
  }

  async renameRecording(id: string, name: string): Promise<any> {
    return this.request(`/recordings/${id}/rename`, { method: 'POST', body: JSON.stringify({ name }) });
  }

  async getRecordings(): Promise<any[]> {
    return this.request('/recordings');
  }

  async getRecording(id: string): Promise<any> {
    return this.request(`/recordings/${id}`);
  }

  async deleteRecording(id: string): Promise<void> {
    return this.request(`/recordings/${id}`, { method: 'DELETE' });
  }

  async getRecordingEvents(id: string, type?: string, limit?: number, offset?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/recordings/${id}/events${query}`);
  }

  // Logs
  async getLogs(params: Record<string, string>): Promise<LogEntry[]> {
    const query = '?' + new URLSearchParams(params).toString();
    return this.request<LogEntry[]>(`/logs${query}`);
  }

  // Reports
  async getReports(): Promise<Report[]> {
    return this.request<Report[]>('/reports');
  }

  async getReport(id: string): Promise<Report & { steps?: TestStepResult[]; logs?: LogEntry[] }> {
    return this.request<Report & { steps?: TestStepResult[]; logs?: LogEntry[] }>(`/reports/${id}`);
  }

  async generateReport(data: { testRunId: string; type?: string }): Promise<Report> {
    return this.request<Report>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Alerts
  async getAlertRules(): Promise<any[]> {
    return this.request('/alerts');
  }

  async createAlertRule(data: { name: string; conditionType: string; threshold: number; testCaseId?: string; environmentId?: string }): Promise<any> {
    return this.request('/alerts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAlertRule(id: string, data: { name?: string; threshold?: number; enabled?: boolean }): Promise<any> {
    return this.request(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAlertRule(id: string): Promise<void> {
    return this.request(`/alerts/${id}`, { method: 'DELETE' });
  }

  async evaluateAlerts(): Promise<{ evaluated: number; triggered: number }> {
    return this.request('/alerts/evaluate', { method: 'POST' });
  }
}

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/api';
  }
  // In the browser, proxy through the Next.js server on the same origin
  // so it works from any host (localhost, Tailscale, etc.)
  return `${window.location.origin}/api`;
}

export const api = new ApiClient(getApiBaseUrl());
