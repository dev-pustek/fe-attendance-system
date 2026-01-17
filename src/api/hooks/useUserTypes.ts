import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userTypeService, CreateUserTypeDto, UpdateUserTypeDto } from "../services/userTypeService";
import { UserType } from "../types/user";

export const useUserTypes = (params?: { withMetrics?: boolean }) => {
  const query = useQuery({
    queryKey: ["userTypes", params],
    queryFn: () => userTypeService.getUserTypes(params),
  });

  const data = query.data as { data?: UserType[] | UserType[]; meta?: any };
  const userTypes = (data?.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])) as UserType[];
  const meta = data?.meta || {};

  return {
    ...query,
    userTypes,
    meta,
  };
};

export const useUserType = (id: string) => {
  return useQuery({
    queryKey: ["userTypes", id],
    queryFn: () => userTypeService.getUserType(id),
    enabled: !!id,
  });
};

export const useCreateUserType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserTypeDto) => userTypeService.createUserType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTypes"] });
    },
  });
};

export const useUpdateUserType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserTypeDto }) => 
      userTypeService.updateUserType(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["userTypes"] });
      queryClient.invalidateQueries({ queryKey: ["userTypes", variables.id] });
    },
  });
};

export const useDeleteUserType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userTypeService.deleteUserType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTypes"] });
    },
  });
};

export const useAssignUserType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userTypeService.assignToUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUnassignUserType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userTypeService.unassignFromUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useBulkAssignUserType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userTypeService.bulkAssign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useAssignUserTypeByClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userTypeService.assignByClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
