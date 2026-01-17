import apiClient from "../client";
import { User, UserParams } from "../types/user";
import { BaseResponse, PaginatedResponse } from "../types/common";

export interface CreateUserDto {
  name: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  photo?: File;
}

export type UpdateUserDto = Partial<CreateUserDto>

export const userService = {
  getUsers: async (params?: UserParams): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>("/users", { params });
    return response.data;
  },

  getTeachers: async (params?: UserParams): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>("/users/teachers", { params });
    return response.data;
  },

  getUser: async (id: string): Promise<BaseResponse<User>> => {
    const response = await apiClient.get<BaseResponse<User>>(`/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserDto): Promise<BaseResponse<User>> => {
    // If no photo is being uploaded, use regular POST with JSON
    if (!data.photo) {
      const response = await apiClient.post<BaseResponse<User>>("/users", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        isActive: data.isActive, // Send as boolean
      });
      return response.data;
    }

    // If photo is being uploaded, use FormData
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("email", data.email);
    if (data.phone) formData.append("phone", data.phone);
    // Send boolean as string "true" or "false"
    if (data.isActive !== undefined) formData.append("isActive", String(data.isActive));
    formData.append("photo", data.photo);

    const response = await apiClient.post<BaseResponse<User>>("/users", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  updateUser: async (id: string, data: UpdateUserDto): Promise<BaseResponse<User>> => {
    // If no photo is being uploaded, use regular PATCH with JSON
    if (!data.photo) {
      const response = await apiClient.patch<BaseResponse<User>>(`/users/${id}`, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        isActive: data.isActive, // Send as boolean
      });
      return response.data;
    }

    // If photo is being uploaded, use FormData with PATCH
    const formData = new FormData();
    if (data.name) formData.append("name", data.name);
    if (data.email) formData.append("email", data.email);
    if (data.phone) formData.append("phone", data.phone);
    // Send boolean as string "true" or "false"
    if (data.isActive !== undefined) formData.append("isActive", String(data.isActive));
    formData.append("photo", data.photo);

    const response = await apiClient.patch<BaseResponse<User>>(`/users/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  getMyQrCode: async (): Promise<{ qrCode: string }> => {
    const response = await apiClient.get("/users/me/qrcode");
    return response.data;
  },

  getMe: async (): Promise<BaseResponse<User>> => {
    const response = await apiClient.get<BaseResponse<User>>("/users/me");
    return response.data;
  },
};
