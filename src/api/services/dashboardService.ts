import apiClient from "../client";

export interface DashboardSummary {
  total_users: number;
  present_today: number;
  late_today: number;
  absent_today: number;
  attendance_rate: number;
  // Add other expected metrics from Swagger observation
}

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>("/dashboard/summary");
    return response.data;
  },
};
