import apiClient from "../client";
import { CreateLeaveTypeDto, LeaveType, LeaveTypeParams, UpdateLeaveTypeDto, LeaveSubmissionParams, LeaveSubmission, CreateLeaveSubmissionDto, UpdateLeaveSubmissionDto, ReviewLeaveDto, LeaveApprovalParams, LeaveApproval } from "../types/leave";
import { ApiResponse } from "../types";
import { PaginatedResponse } from "../types/common";

export const leaveService = {
  getLeaveTypes: async (params?: LeaveTypeParams) => {
    const { data } = await apiClient.get<PaginatedResponse<LeaveType>>("/leaves/types", {
      params,
    });
    return data;
  },

  createLeaveType: async (data: CreateLeaveTypeDto) => {
    const response = await apiClient.post<ApiResponse<LeaveType>>("/leaves/types", data);
    return response.data;
  },

  updateLeaveType: async (public_id : string, data: UpdateLeaveTypeDto) => {
    const response = await apiClient.patch<ApiResponse<LeaveType>>(`/leaves/types/${public_id}`, data);
    return response.data;
  },

  deleteLeaveType: async (public_id : string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/leaves/types/${public_id}`);
    return response.data;
  },

  // Export & Import Leave Types
  exportTypesExcel: async (params?: LeaveTypeParams) => {
    const { data } = await apiClient.get<Blob>("/leaves/types/export/excel", {
      params,
      responseType: "blob",
    });
    return data;
  },

  exportTypesPdf: async (params?: LeaveTypeParams) => {
    const { data } = await apiClient.get<Blob>("/leaves/types/export/pdf", {
      params,
      responseType: "blob",
    });
    return data;
  },

  downloadTypesTemplate: async (withData: boolean = false) => {
    const { data } = await apiClient.get<Blob>("/leaves/types/template", {
      params: { withData },
      responseType: "blob",
    });
    return data;
  },

  importTypes: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<ApiResponse<{ created: number; updated: number; errors: string[] }>>(
      "/leaves/types/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },

  // Submissions
  getSubmissions: async (params?: LeaveSubmissionParams) => {
    const { data } = await apiClient.get<PaginatedResponse<LeaveSubmission>>("/leaves", { params });
    return data;
  },

  getMySubmissions: async (params?: LeaveSubmissionParams) => {
    const { data } = await apiClient.get<PaginatedResponse<LeaveSubmission>>("/leaves/me", { params });
    return data;
  },

  getSubmission: async (public_id : string) => {
    const { data } = await apiClient.get<ApiResponse<LeaveSubmission>>(`/leaves/${public_id}`);
    return data;
  },

  submitLeave: async (data: CreateLeaveSubmissionDto) => {
    const formData = new FormData();
    formData.append("leaveTypeCode", data.leaveTypeCode);
    formData.append("startDate", data.startDate);
    formData.append("endDate", data.endDate);
    formData.append("reason", data.reason);
    if (data.image) {
      formData.append("image", data.image);
    }

    const { data: response } = await apiClient.post<ApiResponse<null>>("/leaves", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response;
  },

  updateSubmission: async (public_id : string, data: UpdateLeaveSubmissionDto) => {
    const hasFile = Object.values(data).some(value => value instanceof File);

    if (hasFile) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value instanceof File ? value : String(value));
          }
        });
        const { data: response } = await apiClient.patch<ApiResponse<null>>(`/leaves/${public_id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return response;
    } else {
        const { data: response } = await apiClient.patch<ApiResponse<null>>(`/leaves/${public_id}`, data);
        return response;
    }
  },

  reviewLeave: async (public_id : string, data: ReviewLeaveDto) => {
    const { data: response } = await apiClient.post<ApiResponse<null>>(`/leaves/${public_id}/review`, data);
    return response;
  },

  deleteSubmission: async (public_id : string) => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/leaves/${public_id}`);
    return data;
  },

  getLeaveApprovals: async (params?: LeaveApprovalParams) => {
    const { data } = await apiClient.get<PaginatedResponse<LeaveApproval>>("/leaves/approvals", { params });
    return data;
  },

  // Export & Import
  exportExcel: async (params?: LeaveSubmissionParams) => {
    const { data } = await apiClient.get<Blob>("/leaves/export/excel", {
      params,
      responseType: "blob",
    });
    return data;
  },

  exportPdf: async (params?: LeaveSubmissionParams) => {
    const { data } = await apiClient.get<Blob>("/leaves/export/pdf", {
      params,
      responseType: "blob",
    });
    return data;
  },

  downloadTemplate: async (withData: boolean = false) => {
    const { data } = await apiClient.get<Blob>("/leaves/template", {
      params: { withData },
      responseType: "blob",
    });
    return data;
  },

  importSubmissions: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post<ApiResponse<{ created: number; updated: number; errors: string[] }>>(
      "/leaves/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },
};
