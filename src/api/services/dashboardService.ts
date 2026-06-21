import apiClient from "../client";
import { DashboardSummary, StudentDashboardSummary, StudentRoadmapItem } from "../types/dashboard";

export const dashboardService = {
  getSummary: async (params?: { startDate?: string; endDate?: string }): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>("/dashboard/summary", { params });
    return response.data;
  },

  getStudentSummary: async (): Promise<StudentDashboardSummary> => {
    const response = await apiClient.get<StudentDashboardSummary>("/dashboard/student-summary");
    return response.data;
  },

  getUserRoadmap: async (): Promise<any> => {
    const response = await apiClient.get<any>("/dashboard/user-roadmap");
    const unwrappedData = response.data?.roadmap ? response.data : response.data?.data;
    
    if (unwrappedData?.roadmap) {
      return unwrappedData;
    }
    // Fallback for previous array response
    return {
      roadmap: Array.isArray(response.data?.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []),
      policies: null
    };
  },
};
