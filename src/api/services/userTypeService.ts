import apiClient from "../client";
import { UserType } from "../types";

export interface CreateUserTypeDto {
  code: string;
  name: string;
  isActive?: boolean;
}

export interface UpdateUserTypeDto {
  name?: string;
  isActive?: boolean;
}

export const userTypeService = {
  getUserTypes: async (params?: { withMetrics?: boolean }): Promise<UserType[]> => {
    const response = await apiClient.get<UserType[]>("/user-types", { params });
    return response.data;
  },

  getUserType: async (id: string): Promise<UserType> => {
    const response = await apiClient.get<UserType>(`/user-types/${id}`);
    return response.data;
  },

  createUserType: async (data: CreateUserTypeDto): Promise<UserType> => {
    const response = await apiClient.post<UserType>("/user-types", data);
    return response.data;
  },

  updateUserType: async (id: string, data: UpdateUserTypeDto): Promise<UserType> => {
    const response = await apiClient.patch<UserType>(`/user-types/${id}`, data);
    return response.data;
  },

  deleteUserType: async (id: string): Promise<void> => {
    await apiClient.delete(`/user-types/${id}`);
  },

  assignToUser: async (data: { userId: string; typeCode: string; isPrimary?: boolean }): Promise<void> => {
    await apiClient.post("/user-types/assign", data);
  },

  unassignFromUser: async (data: { userId: string; typeCode: string }): Promise<void> => {
    await apiClient.post("/user-types/unassign", data);
  },

  bulkAssign: async (data: { userIds: string[]; typeCode: string; isPrimary?: boolean }): Promise<void> => {
    await apiClient.post("/user-types/assign/bulk", data);
  },

  assignByClass: async (data: { classId: string | number; academicYearId?: string | number; typeCode: string; isPrimary: boolean }): Promise<void> => {
    await apiClient.post("/user-types/assign/class", data);
  },
};
