import apiClient from "../client";
import { AuditLog, AuditStats } from "../types/system";
import { PaginationParams, PaginatedResponse } from "../types/common";

export interface AuditLogParams extends PaginationParams {
  action?: string;
  statusCode?: number | string;
  search?: string;
}

export const auditService = {
  getLogs: async (params?: AuditLogParams): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>("/audit/logs", { params });
    return response.data;
  },

  getStats: async (): Promise<AuditStats> => {
    const response = await apiClient.get<AuditStats>("/audit/stats");
    return response.data;
  },
};
