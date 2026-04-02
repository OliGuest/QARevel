import { DevicePlatform } from './device';

export interface AppTarget {
  id: string;
  name: string;
  platform: DevicePlatform;
  packageName?: string;
  executablePath?: string;
  urlPattern?: string;
  version?: string;
  config: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppTargetRequest {
  name: string;
  platform: DevicePlatform;
  packageName?: string;
  executablePath?: string;
  urlPattern?: string;
  version?: string;
}
