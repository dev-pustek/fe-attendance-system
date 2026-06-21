import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";

export const useDashboardSummary = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ["dashboard", "summary", params?.startDate, params?.endDate],
    queryFn: () => dashboardService.getSummary(params),
    // Typically dashboard data should refresh more frequently or explicitly
    staleTime: 1000 * 60, // 1 minute
  });
};
