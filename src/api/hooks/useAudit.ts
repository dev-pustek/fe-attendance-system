import { useQuery } from "@tanstack/react-query";
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
