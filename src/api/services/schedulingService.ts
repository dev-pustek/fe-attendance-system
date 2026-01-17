import apiClient from "../client";
import { ShiftTemplate, ShiftAssignment, ShiftTemplateParams, ShiftAssignmentParams } from "../types/scheduling";
import { PaginatedResponse } from "../types/common";

export interface CreateShiftTemplateDto {
  name: string;
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  workDays: number[];
  effectiveDate?: string | null;
}

export type UpdateShiftTemplateDto = Partial<CreateShiftTemplateDto>;

export interface CreateShiftAssignmentDto {
  userId: string;
  shiftTemplateId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface BulkAssignUsersDto {
  userIds: string[];
  shiftTemplateId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface BulkAssignClassDto {
  classId: string;
  academicYearId: string;
  shiftTemplateId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export type UpdateShiftAssignmentDto = Partial<CreateShiftAssignmentDto>;

export const schedulingService = {
  getTemplates: async (params?: ShiftTemplateParams): Promise<PaginatedResponse<ShiftTemplate>> => {
    const response = await apiClient.get<PaginatedResponse<ShiftTemplate>>("/scheduling/templates", { params });
    return response.data;
  },

  getTemplate: async (id: string): Promise<ShiftTemplate> => {
    const response = await apiClient.get<ShiftTemplate>(`/scheduling/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data: CreateShiftTemplateDto): Promise<ShiftTemplate> => {
    const response = await apiClient.post<ShiftTemplate>("/scheduling/templates", data);
    return response.data;
  },

  updateTemplate: async (id: string, data: UpdateShiftTemplateDto): Promise<ShiftTemplate> => {
    const response = await apiClient.patch<ShiftTemplate>(`/scheduling/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/scheduling/templates/${id}`);
  },

  getAssignments: async (params?: ShiftAssignmentParams): Promise<PaginatedResponse<ShiftAssignment>> => {
    const response = await apiClient.get<PaginatedResponse<ShiftAssignment>>("/scheduling/assignments", { params });
    return response.data;
  },

  createAssignment: async (data: CreateShiftAssignmentDto): Promise<ShiftAssignment> => {
    const response = await apiClient.post<ShiftAssignment>("/scheduling/assignments", data);
    return response.data;
  },

  updateAssignment: async (id: string, data: UpdateShiftAssignmentDto): Promise<ShiftAssignment> => {
    const response = await apiClient.patch<ShiftAssignment>(`/scheduling/assignments/${id}`, data);
    return response.data;
  },

  bulkAssignUsers: async (data: BulkAssignUsersDto): Promise<void> => {
    await apiClient.post("/scheduling/assignments/bulk", data);
  },

  bulkAssignClass: async (data: BulkAssignClassDto): Promise<void> => {
    await apiClient.post("/scheduling/assignments/bulk", data);
  },

  deleteAssignment: async (id: string): Promise<void> => {
    await apiClient.delete(`/scheduling/assignments/${id}`);
  },
};
