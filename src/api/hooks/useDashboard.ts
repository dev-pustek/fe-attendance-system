import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboardService";

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: dashboardService.getSummary,
    // Typically dashboard data should refresh more frequently or explicitly
    staleTime: 1000 * 60, // 1 minute
  });
};
