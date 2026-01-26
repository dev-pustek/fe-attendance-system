import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditService, AuditLogParams } from "../services/auditService";

export const useAuditLogs = (params?: AuditLogParams) => {
  return useQuery({
    queryKey: ["audit", "logs", params],
    queryFn: () => auditService.getLogs(params),
  });
};

export const useAuditStats = () => {
  return useQuery({
    queryKey: ["audit", "stats"],
    queryFn: () => auditService.getStats(),
  });
};

export const useDeleteAuditLog = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number | string) => auditService.deleteLog(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["audit"] });
        }
    });
};
