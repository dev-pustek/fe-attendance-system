import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { identityService } from "../services/identityService";
import { 
  UpdateChannelDto,
  CreateChannelDto, 
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
  DeviceChannelCapabilityParams,
  CreateDeviceChannelCapabilityDto,
  UpdateDeviceChannelCapabilityDto
} from "../types/identity";

// --- Channels ---
export const useIdentityChannels = (params?: ChannelParams) => {
    return useQuery({
        queryKey: ["identity", "channels", params],
        queryFn: () => identityService.getChannels(params),
    });
};

export const useCreateIdentityChannel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateChannelDto) => identityService.createChannel(data),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ["identity", "channels"] });
        },
    });
};

export const useUpdateIdentityChannel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateChannelDto }) => 
            identityService.updateChannel(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "channels"] });
        },
    });
};

export const useDeleteIdentityChannel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => identityService.deleteChannel(id),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ["identity", "channels"] });
        },
    });
};

// --- Credentials ---
export const useIdentityCredentials = (params?: CredentialParams) => {
    return useQuery({
        queryKey: ["identity", "credentials", params],
        queryFn: () => identityService.getCredentials(params),
    });
};

export const useCreateIdentityCredential = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCredentialDto) => identityService.createCredential(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "credentials"] });
        },
    });
};

export const useUpdateIdentityCredential = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCredentialDto }) => 
            identityService.updateCredential(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "credentials"] });
        },
    });
};

export const useDeleteIdentityCredential = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => identityService.deleteCredential(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "credentials"] });
        },
    });
};

// --- Capture Logs ---
export const useIdentityCaptureLogs = (params?: CaptureLogParams) => {
    return useQuery({
        queryKey: ["identity", "capture-logs", params],
        queryFn: () => identityService.getCaptureLogs(params),
    });
};

export const useCreateIdentityCaptureLog = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCaptureLogDto) => identityService.createCaptureLog(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "capture-logs"] });
        },
    });
};

export const useUpdateIdentityCaptureLog = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCaptureLogDto }) => 
            identityService.updateCaptureLog(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "capture-logs"] });
        },
    });
};

export const useDeleteIdentityCaptureLog = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => identityService.deleteCaptureLog(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "capture-logs"] });
        },
    });
};

// --- Resolutions ---
export const useIdentityResolutions = (params?: ResolutionParams) => {
    return useQuery({
        queryKey: ["identity", "resolutions", params],
        queryFn: () => identityService.getResolutions(params),
    });
};

export const useCreateIdentityResolution = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateResolutionDto) => identityService.createResolution(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "resolutions"] });
            queryClient.invalidateQueries({ queryKey: ["identity", "capture-logs"] });
        },
    });
};

export const useUpdateIdentityResolution = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateResolutionDto }) => 
            identityService.updateResolution(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "resolutions"] });
        },
    });
};

export const useDeleteIdentityResolution = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => identityService.deleteResolution(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "resolutions"] });
        },
    });
};

export const useMatchIdentityResolution = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: MatchResolutionDto) => identityService.matchResolution(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "resolutions"] });
            queryClient.invalidateQueries({ queryKey: ["identity", "capture-logs"] });
        },
    });
};

// --- Device Channel Capabilities ---
export const useDeviceChannelCapabilities = (params?: DeviceChannelCapabilityParams) => {
    return useQuery({
        queryKey: ["identity", "capabilities", params],
        queryFn: () => identityService.getDeviceChannelCapabilities(params),
    });
};

export const useCreateDeviceChannelCapability = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateDeviceChannelCapabilityDto) => identityService.createDeviceChannelCapability(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "capabilities"] });
        },
    });
};

export const useUpdateDeviceChannelCapability = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateDeviceChannelCapabilityDto }) => identityService.updateDeviceChannelCapability(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "capabilities"] });
        },
    });
};

export const useDeleteDeviceChannelCapability = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => identityService.deleteDeviceChannelCapability(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["identity", "capabilities"] });
        },
    });
};
