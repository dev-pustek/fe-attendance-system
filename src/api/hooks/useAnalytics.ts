import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import { MetricsQueryParams, MetricsResponse } from '../types/analytics';

export const useAttendanceMetrics = <T = any>(params?: MetricsQueryParams) => {
  return useQuery<MetricsResponse<T>, Error>({
    queryKey: ['attendance-metrics', params],
    queryFn: () => analyticsService.getAttendanceMetrics<T>(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });
};

export const useAdvancedAnalytics = (params?: MetricsQueryParams) => {
  return useQuery<any, Error>({
    queryKey: ['attendance-advanced-benchmark', params],
    queryFn: () => analyticsService.getAdvancedBenchmark(params),
    staleTime: 5 * 60 * 1000,
  });
};
