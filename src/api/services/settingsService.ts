import apiClient from "../client";
import { SystemSetting, SettingParams } from "../types/system";
import { PaginatedResponse } from "../types/common";

export interface CreateSettingDto {
  key: string;
  value: string;
  description?: string;
}

export type UpdateSettingDto = Partial<CreateSettingDto>;

export const settingsService = {
  getSettings: async (params?: SettingParams): Promise<PaginatedResponse<SystemSetting>> => {
    const response = await apiClient.get<PaginatedResponse<SystemSetting>>("/settings", { params });
    return response.data;
  },

  getSetting: async (key: string): Promise<SystemSetting> => {
    const response = await apiClient.get<SystemSetting>(`/settings/${key}`);
    return response.data;
  },

  createSetting: async (data: CreateSettingDto): Promise<SystemSetting> => {
    const response = await apiClient.post<SystemSetting>("/settings", data);
    return response.data;
  },

  updateSetting: async (key: string, data: UpdateSettingDto): Promise<SystemSetting> => {
    const response = await apiClient.patch<SystemSetting>(`/settings/${key}`, data);
    return response.data;
  },

  deleteSetting: async (key: string): Promise<void> => {
    await apiClient.delete(`/settings/${key}`);
  },
};
