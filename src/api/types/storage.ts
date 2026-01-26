export type StorageProviderType = 'local' | 'onedrive' | 'googledrive';

export interface StorageConfig {
  client_id?: string;
  client_secret?: string; // Often hidden in responses, but needed for updates
  tenant_id?: string;     // OneDrive specific
}

export interface StorageIntegration {
  id: number;
  provider: StorageProviderType;
  isActive: boolean;
  config: StorageConfig;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthUrlResponse {
  url: string;
}

export interface AuthCodePayload {
  code: string;
  redirect_uri: string;
}
