import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deviceService, CreateDeviceDto, UpdateDeviceDto, CreateDeviceConfigDto, UpdateDeviceConfigDto } from "../services/deviceService";
import { DeviceParams, DeviceConfigParams } from "../types/devices";

export const useDevices = (params?: DeviceParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["devices", params],
    queryFn: () => deviceService.getDevices(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDeviceDto) => deviceService.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateDeviceDto }) =>
      deviceService.updateDevice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["devices", String(variables.id)] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deviceService.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useDevice = (id: string | number) => {
  return useQuery({
    queryKey: ["devices", String(id)],
    queryFn: () => deviceService.getDevice(id),
    enabled: !!id,
  });
};

// Device Configs
export const useDeviceConfigs = (params?: DeviceConfigParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["deviceConfigs", params],
    queryFn: () => deviceService.getConfigs(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDeviceConfigDto) => deviceService.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceConfigs"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdateDeviceConfigDto }) =>
      deviceService.updateConfig(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deviceConfigs"] });
      queryClient.invalidateQueries({ queryKey: ["deviceConfigs", String(variables.id)] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deviceService.deleteConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deviceConfigs"] });
    },
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};
