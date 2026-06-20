import apiClient from "../client";
import { MetricsQueryParams, MetricsResponse, AdminMetricsData, TeacherMetricsData, CurriculumMetricsData, PiketMetricsData, PersonalMetricsData, StudentMetricsData } from "../types/analytics";

export const analyticsService = {
  getAttendanceMetrics: async <T = any>(params?: MetricsQueryParams): Promise<MetricsResponse<T>> => {
    const response = await apiClient.get<MetricsResponse<T>>('/analytics/metrics', { params });
    return response.data;
  },
  getAdvancedBenchmark: async (params?: MetricsQueryParams): Promise<any> => {
    const response = await apiClient.get<any>('/analytics/metrics/benchmark', { params });
    return response.data;
  },
  exportBenchmarkExcel: async (params?: MetricsQueryParams): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>('/analytics/metrics/benchmark/export/excel', {
      params,
      responseType: 'blob',
    });
    return data;
  },
};
