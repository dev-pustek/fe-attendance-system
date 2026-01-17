import apiClient from "../client";
import { Device, DeviceConfig, DeviceParams, DeviceConfigParams } from "../types/devices";
import { PaginatedResponse } from "../types/common";

export interface CreateDeviceDto {
  deviceName: string;
  ipAddress?: string;
  location?: string;
  isActive?: boolean;
  config?: any;
}

export type UpdateDeviceDto = Partial<CreateDeviceDto>;

export interface CreateDeviceConfigDto {
  deviceId: string | number;
  configKey: string;
  configValue: string;
}

export type UpdateDeviceConfigDto = Partial<CreateDeviceConfigDto>;

export const deviceService = {
  getDevices: async (params?: DeviceParams): Promise<PaginatedResponse<Device>> => {
    const response = await apiClient.get<PaginatedResponse<Device>>("/devices", { params });
    return response.data;
  },

  getDevice: async (id: string | number): Promise<Device> => {
    const response = await apiClient.get<Device>(`/devices/${id}`);
    return response.data;
  },

  createDevice: async (data: CreateDeviceDto): Promise<Device> => {
    const response = await apiClient.post<Device>("/devices", data);
    return response.data;
  },

  updateDevice: async (id: string | number, data: UpdateDeviceDto): Promise<Device> => {
    const response = await apiClient.patch<Device>(`/devices/${id}`, data);
    return response.data;
  },

  deleteDevice: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/devices/${id}`);
  },

  // Configs
  getConfigs: async (params?: DeviceConfigParams): Promise<PaginatedResponse<DeviceConfig>> => {
    const response = await apiClient.get<PaginatedResponse<DeviceConfig>>("/device-configs", { params });
    return response.data;
  },

  getConfig: async (id: string | number): Promise<DeviceConfig> => {
    const response = await apiClient.get<DeviceConfig>(`/device-configs/${id}`);
    return response.data;
  },

  createConfig: async (data: CreateDeviceConfigDto): Promise<DeviceConfig> => {
    const response = await apiClient.post<DeviceConfig>("/device-configs", data);
    return response.data;
  },

  updateConfig: async (id: string | number, data: UpdateDeviceConfigDto): Promise<DeviceConfig> => {
    const response = await apiClient.patch<DeviceConfig>(`/device-configs/${id}`, data);
    return response.data;
  },

  deleteConfig: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/device-configs/${id}`);
  },
};
