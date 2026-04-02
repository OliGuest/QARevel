import { DevicePlatform } from './device';

export enum TestPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum TestType {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
  HYBRID = 'HYBRID',
}

export enum TestRunType {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
  LOAD = 'LOAD',
}

export enum TestRunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED',
}

export enum StepStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  BLOCKED = 'BLOCKED',
  ERROR = 'ERROR',
}

export enum SelectorType {
  CSS = 'CSS',
  XPATH = 'XPATH',
  ACCESSIBILITY_ID = 'ACCESSIBILITY_ID',
  ID = 'ID',
}

export enum StepAction {
  NAVIGATE = 'NAVIGATE',
  CLICK = 'CLICK',
  FILL = 'FILL',
  SELECT = 'SELECT',
  CHECK = 'CHECK',
  UNCHECK = 'UNCHECK',
  HOVER = 'HOVER',
  SCROLL = 'SCROLL',
  SWIPE = 'SWIPE',
  WAIT = 'WAIT',
  ASSERT_VISIBLE = 'ASSERT_VISIBLE',
  ASSERT_TEXT = 'ASSERT_TEXT',
  ASSERT_URL = 'ASSERT_URL',
  SCREENSHOT = 'SCREENSHOT',
  CUSTOM_SCRIPT = 'CUSTOM_SCRIPT',
}

export interface TestStep {
  id: string;
  testCaseId: string;
  stepNumber: number;
  action: string;
  expectedResult?: string;
  selector?: string;
  selectorType?: SelectorType;
  inputData?: Record<string, any>;
  timeoutMs: number;
  isOptional: boolean;
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  appTargetId?: string;
  platform: DevicePlatform;
  priority: TestPriority;
  type: TestType;
  tags: string[];
  preconditions?: string;
  automationCode?: string;
  estimatedDurationSec?: number;
  steps?: TestStep[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestCaseRequest {
  title: string;
  description?: string;
  appTargetId?: string;
  platform: DevicePlatform;
  priority?: TestPriority;
  type?: TestType;
  tags?: string[];
  preconditions?: string;
  automationCode?: string;
}

export interface CreateTestStepRequest {
  stepNumber: number;
  action: string;
  expectedResult?: string;
  selector?: string;
  selectorType?: SelectorType;
  inputData?: Record<string, any>;
  timeoutMs?: number;
  isOptional?: boolean;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  appTargetId?: string;
  tags: string[];
  cases?: TestCase[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestRun {
  id: string;
  suiteId?: string;
  testCaseId?: string;
  deviceId: string;
  environmentId: string;
  appTargetId: string;
  triggeredBy: string;
  type: TestRunType;
  status: TestRunStatus;
  correlationId: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  summary?: Record<string, any>;
  config?: Record<string, any>;
  createdAt: string;
}

export interface TestStepResult {
  id: string;
  testRunId: string;
  testStepId?: string;
  stepNumber: number;
  status: StepStatus;
  actualResult?: string;
  errorMessage?: string;
  screenshotKey?: string;
  durationMs?: number;
  notes?: string;
  executedAt: string;
}

export interface StartTestRunRequest {
  type: TestRunType;
  suiteId?: string;
  testCaseId?: string;
  deviceId: string;
  environmentId: string;
  appTargetId: string;
  config?: Record<string, any>;
}

export interface StartTestRunResponse {
  id: string;
  correlationId: string;
  status: TestRunStatus;
  wsChannel: string;
}
