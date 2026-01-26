import apiClient from "../client";
import { 
  StorageIntegration, 
  StorageProviderType, 
  StorageConfig, 
  AuthUrlResponse, 
  AuthCodePayload 
} from "../types/storage";

export const storageService = {
  getIntegrations: async (): Promise<StorageIntegration[]> => {
    const response = await apiClient.get<{ data: StorageIntegration[] }>("/settings/storage-integrations");
    // The apiClient interceptor wraps arrays in { data: [], ...metadata }
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  createIntegration: async (data: { provider: StorageProviderType; config: StorageConfig }): Promise<StorageIntegration> => {
    const response = await apiClient.post<StorageIntegration>("/settings/storage-integrations", data);
    return response.data;
  },

  updateStatus: async (id: number, isActive: boolean): Promise<StorageIntegration> => {
    const response = await apiClient.patch<StorageIntegration>(`/settings/storage-integrations/${id}`, { isActive });
    return response.data;
  },
  
  updateConfig: async (id: number, config: StorageConfig): Promise<StorageIntegration> => {
      const response = await apiClient.patch<StorageIntegration>(`/settings/storage-integrations/${id}`, { config });
      return response.data;
  },
  
  configureIntegration: async (provider: StorageProviderType, config: StorageConfig): Promise<StorageIntegration> => {
      const response = await apiClient.post<StorageIntegration>("/settings/storage-integrations", {
          provider,
          config
      });
      return response.data;
  },

  getAuthUrl: async (id: number, redirect_uri: string): Promise<AuthUrlResponse> => {
    const response = await apiClient.get<AuthUrlResponse>(`/settings/storage-integrations/${id}/auth-url`, {
      params: { redirect_uri }
    });
    return response.data;
  },

  exchangeAuthCode: async (id: number, payload: AuthCodePayload): Promise<void> => {
    await apiClient.post(`/settings/storage-integrations/${id}/auth`, payload);
  },

  deleteIntegration: async (id: number): Promise<void> => {
    await apiClient.delete(`/settings/storage-integrations/${id}`);
  }
};
