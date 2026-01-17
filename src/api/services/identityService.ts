import apiClient from "../client";
import { PaginatedResponse, ApiResponse } from "../types/common";
import { 
  IdentityChannel, 
  IdentityCredential, 
  IdentityCaptureLog, 
  IdentityResolution,
  CreateChannelDto,
  UpdateChannelDto,
  CreateCredentialDto,
  UpdateCredentialDto,
  CreateCaptureLogDto,
  UpdateCaptureLogDto,
  CreateResolutionDto,
  UpdateResolutionDto,
  CredentialParams,
  CaptureLogParams,
  ResolutionParams,
  ChannelParams,
  MatchResolutionDto,
  DeviceChannelCapability,
  CreateDeviceChannelCapabilityDto,
  UpdateDeviceChannelCapabilityDto,
  DeviceChannelCapabilityParams
} from "../types/identity";

export const identityService = {
  // --- Channels ---
  getChannels: async (params?: ChannelParams): Promise<PaginatedResponse<IdentityChannel>> => {
    const response = await apiClient.get<PaginatedResponse<IdentityChannel>>("/identity-channels", { params });
    return response.data;
  },

  createChannel: async (data: CreateChannelDto): Promise<ApiResponse<IdentityChannel>> => {
    const response = await apiClient.post<ApiResponse<IdentityChannel>>("/identity-channels", data);
    return response.data;
  },

  updateChannel: async (id: number, data: UpdateChannelDto): Promise<ApiResponse<IdentityChannel>> => {
    const response = await apiClient.patch<ApiResponse<IdentityChannel>>(`/identity-channels/${id}`, data);
    return response.data;
  },

  deleteChannel: async (id: number): Promise<void> => {
    await apiClient.delete(`/identity-channels/${id}`);
  },

  // --- Credentials ---
  getCredentials: async (params?: CredentialParams): Promise<PaginatedResponse<IdentityCredential>> => {
    const response = await apiClient.get<PaginatedResponse<IdentityCredential>>("/identity-credentials", { params });
    return response.data;
  },

  createCredential: async (data: CreateCredentialDto): Promise<ApiResponse<IdentityCredential>> => {
    const response = await apiClient.post<ApiResponse<IdentityCredential>>("/identity-credentials", data);
    return response.data;
  },

  updateCredential: async (id: string, data: UpdateCredentialDto): Promise<ApiResponse<IdentityCredential>> => {
    const response = await apiClient.patch<ApiResponse<IdentityCredential>>(`/identity-credentials/${id}`, data);
    return response.data;
  },

  deleteCredential: async (id: string): Promise<void> => {
    await apiClient.delete(`/identity-credentials/${id}`);
  },

  // --- Capture Logs ---
  getCaptureLogs: async (params?: CaptureLogParams): Promise<PaginatedResponse<IdentityCaptureLog>> => {
    const response = await apiClient.get<PaginatedResponse<IdentityCaptureLog>>("/identity-capture-logs", { params });
    return response.data;
  },

  getCaptureLog: async (id: string): Promise<ApiResponse<IdentityCaptureLog>> => {
    const response = await apiClient.get<ApiResponse<IdentityCaptureLog>>(`/identity-capture-logs/${id}`);
    return response.data;
  },

  createCaptureLog: async (data: CreateCaptureLogDto): Promise<ApiResponse<IdentityCaptureLog>> => {
    const response = await apiClient.post<ApiResponse<IdentityCaptureLog>>("/identity-capture-logs", data);
    return response.data;
  },

  updateCaptureLog: async (id: string, data: UpdateCaptureLogDto): Promise<ApiResponse<IdentityCaptureLog>> => {
    const response = await apiClient.patch<ApiResponse<IdentityCaptureLog>>(`/identity-capture-logs/${id}`, data);
    return response.data;
  },

  deleteCaptureLog: async (id: string): Promise<void> => {
    await apiClient.delete(`/identity-capture-logs/${id}`);
  },

  // --- Resolutions ---
  getResolutions: async (params?: ResolutionParams): Promise<PaginatedResponse<IdentityResolution>> => {
    const response = await apiClient.get<PaginatedResponse<IdentityResolution>>("/identity-resolutions", { params });
    return response.data;
  },

  getResolution: async (id: string): Promise<ApiResponse<IdentityResolution>> => {
    const response = await apiClient.get<ApiResponse<IdentityResolution>>(`/identity-resolutions/${id}`);
    return response.data;
  },

  createResolution: async (data: CreateResolutionDto): Promise<ApiResponse<IdentityResolution>> => {
    const response = await apiClient.post<ApiResponse<IdentityResolution>>("/identity-resolutions", data);
    return response.data;
  },

  updateResolution: async (id: string, data: UpdateResolutionDto): Promise<ApiResponse<IdentityResolution>> => {
    const response = await apiClient.patch<ApiResponse<IdentityResolution>>(`/identity-resolutions/${id}`, data);
    return response.data;
  },

  deleteResolution: async (id: string): Promise<void> => {
    await apiClient.delete(`/identity-resolutions/${id}`);
  },

  matchResolution: async (data: MatchResolutionDto): Promise<ApiResponse<IdentityResolution>> => {
    const response = await apiClient.post<ApiResponse<IdentityResolution>>("/identity-resolutions/match", data);
    return response.data;
  },

  // --- Device Channel Capabilities ---
  getDeviceChannelCapabilities: async (params?: DeviceChannelCapabilityParams): Promise<PaginatedResponse<DeviceChannelCapability>> => {
    const response = await apiClient.get<PaginatedResponse<DeviceChannelCapability>>("/device-channel-capabilities", { params });
    return response.data;
  },

  createDeviceChannelCapability: async (data: CreateDeviceChannelCapabilityDto): Promise<ApiResponse<DeviceChannelCapability>> => {
    const response = await apiClient.post<ApiResponse<DeviceChannelCapability>>("/device-channel-capabilities", data);
    return response.data;
  },

  updateDeviceChannelCapability: async (id: number, data: UpdateDeviceChannelCapabilityDto): Promise<ApiResponse<DeviceChannelCapability>> => {
    const response = await apiClient.patch<ApiResponse<DeviceChannelCapability>>(`/device-channel-capabilities/${id}`, data);
    return response.data;
  },

  deleteDeviceChannelCapability: async (id: number): Promise<void> => {
    await apiClient.delete(`/device-channel-capabilities/${id}`);
  }
};
