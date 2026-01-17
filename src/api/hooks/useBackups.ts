import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backupService } from "../services/backupService";
import { UpdateBackupSettingsDto } from "../types/backup";

export const useBackups = () => {
  const queryClient = useQueryClient();

  const backupsQuery = useQuery({
    queryKey: ["backups"],
    queryFn: () => backupService.listBackups(),
  });

  const triggerMutation = useMutation({
    mutationFn: () => backupService.triggerBackup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => backupService.deleteBackup(filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });

  const data = backupsQuery.data as any;
  const backups = data?.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);

  return {
    backups,
    isLoading: backupsQuery.isLoading,
    error: backupsQuery.error,
    refetch: backupsQuery.refetch,
    triggerBackup: triggerMutation.mutate,
    isTriggering: triggerMutation.isPending,
    deleteBackup: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};

export const useBackupSettings = () => {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["backup-settings"],
    queryFn: () => backupService.getSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBackupSettingsDto) => backupService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-settings"] });
    },
  });

  const data = settingsQuery.data as any;
  const settings = data?.data ? data.data : data;

  return {
    settings,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
};
