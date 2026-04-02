export enum EnvironmentType {
  LOCAL = 'LOCAL',
  REMOTE = 'REMOTE',
}

export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  baseUrl: string;
  description?: string;
  healthCheckUrl?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  type: EnvironmentType;
  baseUrl: string;
  description?: string;
  healthCheckUrl?: string;
}

export interface HealthCheckResponse {
  healthy: boolean;
  responseTimeMs: number;
}
