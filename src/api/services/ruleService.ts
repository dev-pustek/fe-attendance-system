import apiClient from "../client";
import { PaginatedResponse, BaseResponse } from "../types/common";
import { 
  RuleContext, RuleContextParams, CreateRuleContextDto, UpdateRuleContextDto,
  ScheduleRule, ScheduleRuleParams, CreateScheduleRuleDto, UpdateScheduleRuleDto,
  AttendanceRule, AttendanceRuleParams, CreateAttendanceRuleDto, UpdateAttendanceRuleDto
} from "../types/rules";

export const ruleService = {
  // Rule Contexts
  getRuleContexts: async (params?: RuleContextParams) => {
    const response = await apiClient.get<PaginatedResponse<RuleContext>>("/rule-contexts", { params });
    return response.data;
  },

  createRuleContext: async (data: CreateRuleContextDto) => {
    const response = await apiClient.post<BaseResponse<RuleContext>>("/rule-contexts", data);
    return response.data;
  },

  updateRuleContext: async (id: number | string, data: UpdateRuleContextDto) => {
    const response = await apiClient.patch<BaseResponse<RuleContext>>(`/rule-contexts/${id}`, data);
    return response.data;
  },

  deleteRuleContext: async (id: number | string) => {
    await apiClient.delete(`/rule-contexts/${id}`);
  },

  // Schedule Rules
  getScheduleRules: async (params?: ScheduleRuleParams) => {
    const response = await apiClient.get<PaginatedResponse<ScheduleRule>>("/schedule-rules", { params });
    return response.data;
  },

  createScheduleRule: async (data: CreateScheduleRuleDto) => {
    const response = await apiClient.post<BaseResponse<ScheduleRule>>("/schedule-rules", data);
    return response.data;
  },

  updateScheduleRule: async (id: number | string, data: UpdateScheduleRuleDto) => {
    const response = await apiClient.patch<BaseResponse<ScheduleRule>>(`/schedule-rules/${id}`, data);
    return response.data;
  },

  deleteScheduleRule: async (id: number | string) => {
    await apiClient.delete(`/schedule-rules/${id}`);
  },

  getEffectiveScheduleRules: async (params: { classId: number | string }) => {
    const response = await apiClient.get<BaseResponse<Record<string, ScheduleRule>>>("/schedule-rules/effective", { params });
    return response.data;
  },

  // Attendance Rules
  getAttendanceRules: async (params?: AttendanceRuleParams) => {
    const response = await apiClient.get<PaginatedResponse<AttendanceRule>>("/attendance-rules", { params });
    return response.data;
  },

  createAttendanceRule: async (data: CreateAttendanceRuleDto) => {
    const response = await apiClient.post<BaseResponse<AttendanceRule>>("/attendance-rules", data);
    return response.data;
  },

  updateAttendanceRule: async (id: number | string, data: UpdateAttendanceRuleDto) => {
    const response = await apiClient.patch<BaseResponse<AttendanceRule>>(`/attendance-rules/${id}`, data);
    return response.data;
  },

  deleteAttendanceRule: async (id: number | string) => {
    await apiClient.delete(`/attendance-rules/${id}`);
  },
};
