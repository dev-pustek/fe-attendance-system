import apiClient from "../client";
import { Backup, BackupSettings, UpdateBackupSettingsDto } from "../types/backup";
import { ApiResponse } from "../types/common";

export const backupService = {
  listBackups: async (): Promise<ApiResponse<Backup[]>> => {
    const response = await apiClient.get<ApiResponse<Backup[]>>("/backups");
    return response.data;
  },

  triggerBackup: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>("/backups/trigger");
    return response.data;
  },

  deleteBackup: async (filename: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete<ApiResponse<any>>(`/backups/${filename}`);
    return response.data;
  },

  getSettings: async (): Promise<ApiResponse<BackupSettings>> => {
    const response = await apiClient.get<ApiResponse<BackupSettings>>("/backups/settings");
    return response.data;
  },

  updateSettings: async (data: UpdateBackupSettingsDto): Promise<ApiResponse<BackupSettings>> => {
    const response = await apiClient.patch<ApiResponse<BackupSettings>>("/backups/settings", data);
    return response.data;
  },

  getDownloadUrl: (filename: string): string => {
    return `${apiClient.defaults.baseURL}/backups/download/${filename}`;
  },
};
