export enum EventType {
  TAP = 'TAP',
  CLICK = 'CLICK',
  LONG_PRESS = 'LONG_PRESS',
  SWIPE = 'SWIPE',
  TYPE = 'TYPE',
  SCROLL = 'SCROLL',
  NAVIGATE = 'NAVIGATE',
}

export enum CrashSeverity {
  CRASH = 'CRASH',
  ANR = 'ANR',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export enum LogSource {
  APP = 'APP',
  DEVICE = 'DEVICE',
  AUTOMATION = 'AUTOMATION',
  PROXY = 'PROXY',
  AGENT = 'AGENT',
}

export interface ClickEvent {
  id?: string;
  testRunId?: string;
  testStepResultId?: string;
  correlationId: string;
  eventType: EventType;
  targetElement?: string;
  targetText?: string;
  screenName?: string;
  coordinates?: { x: number; y: number };
  inputValue?: string;
  deviceId?: string;
  timestamp: string;
}

export interface CrashEvent {
  id?: string;
  testRunId?: string;
  correlationId: string;
  deviceId?: string;
  severity: CrashSeverity;
  type?: string;
  message: string;
  stackTrace?: string;
  lastActions?: any[];
  lastApiCalls?: any[];
  deviceState?: Record<string, any>;
  screenshotKey?: string;
  occurredAt: string;
}

export interface ApiTrace {
  id?: string;
  testRunId?: string;
  testStepResultId?: string;
  correlationId: string;
  method: string;
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseTimeMs?: number;
  error?: string;
  capturedAt: string;
}

export interface LogEntry {
  id?: string;
  testRunId?: string;
  correlationId: string;
  source: LogSource;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  deviceId?: string;
  timestamp: string;
}
