export type DeviceProfilePlatform = 'web' | 'android';

export interface DeviceProfile {
  id: string;
  key: string;
  label: string;
  platform: DeviceProfilePlatform;
  widthPx: number;
  heightPx: number;
  icon?: string | null;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceProfileRequest {
  label: string;
  platform: DeviceProfilePlatform;
  width: number;
  height: number;
  icon?: string;
}
