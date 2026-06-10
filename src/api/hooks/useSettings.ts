import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService, CreateSettingDto, UpdateSettingDto } from "../services/settingsService";
import { SettingParams } from "../types/system";

export const useSettings = (params?: SettingParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["settings", params],
    queryFn: () => settingsService.getSettings(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSettingDto) => settingsService.createSetting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateSettingDto }) =>
      settingsService.updateSetting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => settingsService.deleteSetting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  return {
    ...query,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};

export const useSetting = (key: string) => {
  return useQuery({
    queryKey: ["settings", key],
    queryFn: () => settingsService.getSetting(key),
    enabled: !!key,
  });
};
