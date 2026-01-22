import apiClient from "../client";
import { DashboardSummary, StudentDashboardSummary } from "../types/dashboard";

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>("/dashboard/summary");
    return response.data;
  },

  getStudentSummary: async (): Promise<StudentDashboardSummary> => {
    const response = await apiClient.get<StudentDashboardSummary>("/dashboard/student-summary");
    return response.data;
  },
};

