export interface Device {
  id?: string | number; // Made optional as it's missing in some responses
  public_id: string;
  deviceName: string;
  ipAddress?: string | null;
  location?: string | null;
  isActive: boolean;
  lastSeen?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: {
    rtsp_url?: string;
    capture_interval_ms?: number;
    username?: string;
    password?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceConfig {
  id: string | number;
  deviceId: string | number;
  configKey: string;
  configValue: string;
  device?: Device;
}

export interface DeviceParams {
  search?: string;
  isActive?: boolean | string;
  page?: number | string;
  limit?: number | string;
}

export interface DeviceConfigParams {
  search?: string;
  deviceId?: string | number;
  page?: number | string;
  limit?: number | string;
}

export interface CreateDeviceDto {
  deviceName: string;
  ipAddress?: string;
  location?: string;
  isActive: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
}

export type UpdateDeviceDto = Partial<CreateDeviceDto>;
