import apiClient from "../client";
import { Role, RoleParams } from "../types/user";
import { PaginatedResponse } from "../types/common";

export interface CreateRoleDto {
  name: string;
  displayName: string;
}

export type UpdateRoleDto = Partial<CreateRoleDto>;


export const accessControlService = {
  // Roles
  getRoles: async (params?: RoleParams): Promise<PaginatedResponse<Role>> => {
    const response = await apiClient.get<PaginatedResponse<Role>>("/access-control/roles", { params });
    return response.data;
  },

  createRole: async (data: CreateRoleDto): Promise<Role> => {
    const response = await apiClient.post<Role>("/access-control/roles", data);
    return response.data;
  },

  updateRole: async (id: string | number, data: UpdateRoleDto): Promise<Role> => {
    const response = await apiClient.patch<Role>(`/access-control/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/access-control/roles/${id}`);
  },

  // User Roles
  getUserRoles: async (userId: string | number): Promise<string[]> => {
    const response = await apiClient.get<string[]>(`/access-control/users/${userId}/roles`);
    return response.data;
  },

  assignRole: async (userId: string | number, roleName: string): Promise<void> => {
    await apiClient.post(`/access-control/users/${userId}/roles`, { roleName });
  },

  removeRole: async (userId: string | number, roleName: string): Promise<void> => {
    await apiClient.delete(`/access-control/users/${userId}/roles/${roleName}`);
  },
};
