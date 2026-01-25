import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accessControlService } from "../services/accessControlService";
import { Role, RoleParams } from "../types/user";
import { PaginatedResponse } from "../types/common";

export const useAccessControl = (params?: RoleParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["access-control", "roles", params],
    queryFn: () => accessControlService.getRoles(params),
  });

  const data = query.data as PaginatedResponse<Role> | Role[];
  const roles = data && 'data' in data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  const meta = data && 'meta' in data ? data.meta : {};

  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; displayName: string }) =>
      accessControlService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-control", "roles"] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: { name?: string; displayName?: string } }) =>
      accessControlService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-control", "roles"] });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string | number) => accessControlService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-control", "roles"] });
    },
  });

  return {
    ...query,
    roles,
    meta,
    createRoleMutation,
    updateRoleMutation,
    deleteRoleMutation,
  };
};

export const useUserRoles = (userId: string | number) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["access-control", "user-roles", userId],
    queryFn: () => accessControlService.getUserRoles(userId),
    enabled: !!userId,
  });

  const assignRoleMutation = useMutation({
    mutationFn: (roleName: string) => accessControlService.assignRole(userId, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-control", "user-roles", userId] });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (roleName: string) => accessControlService.removeRole(userId, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["access-control", "user-roles", userId] });
    },
  });

  return {
    ...query,
    assignRoleMutation,
    removeRoleMutation,
  };
};

export const useBulkAssignRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accessControlService.bulkAssign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["access-control", "roles"] });
    },
  });
};
