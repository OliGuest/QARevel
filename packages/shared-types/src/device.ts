export enum DevicePlatform {
  ANDROID = 'ANDROID',
  WINDOWS = 'WINDOWS',
  BROWSER = 'BROWSER',
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
  ERROR = 'ERROR',
}

export interface Device {
  id: string;
  name: string;
  platform: DevicePlatform;
  osVersion?: string;
  model?: string;
  serialNumber?: string;
  ipAddress?: string;
  agentVersion?: string;
  status: DeviceStatus;
  capabilities: Record<string, any>;
  lastHeartbeat?: string;
  registeredBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceRequest {
  name: string;
  platform: DevicePlatform;
  serialNumber?: string;
  ipAddress?: string;
  model?: string;
  osVersion?: string;
}

export interface RegisterDeviceResponse {
  id: string;
  agentToken: string;
}

export interface DeviceHeartbeat {
  status: DeviceStatus;
  battery?: number;
  memoryFreeMb?: number;
  cpuPercent?: number;
}
