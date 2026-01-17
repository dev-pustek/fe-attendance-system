import apiClient from "../client";
import { PaginationParams, PaginatedResponse } from "../types/common";
import { FaceTemplate, FaceDetection, FaceMatch } from "../types/ai";

export const aiService = {
  registerFace: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    await apiClient.post("/ai/register", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  verifyFace: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/ai/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Admin
  getAllTemplates: async (params?: PaginationParams & { userId?: string }): Promise<PaginatedResponse<FaceTemplate>> => {
    const response = await apiClient.get<PaginatedResponse<FaceTemplate>>("/ai/admin/templates", { params });
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/ai/admin/templates/${id}`);
  },

  getDetections: async (params?: PaginationParams): Promise<PaginatedResponse<FaceDetection>> => {
    const response = await apiClient.get<PaginatedResponse<FaceDetection>>("/ai/admin/detections", { params });
    return response.data;
  },

  getMatches: async (params?: PaginationParams): Promise<PaginatedResponse<FaceMatch>> => {
    const response = await apiClient.get<PaginatedResponse<FaceMatch>>("/ai/admin/matches", { params });
    return response.data;
  },
};
