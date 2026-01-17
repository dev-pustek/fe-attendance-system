import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService, CreateUserDto, UpdateUserDto } from "../services/userService";
import { UserParams } from "../types/user";

export const useUsers = (params?: UserParams) => {
  const query = useQuery({
    queryKey: ["users", params],
    queryFn: () => userService.getUsers(params),
  });

  const data = query.data as any;
  const users = data?.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  const meta = data?.meta || {};

  return {
    ...query,
    users,
    meta,
  };
};

export const useTeachers = (params?: UserParams) => {
  const query = useQuery({
    queryKey: ["users", "teachers", params],
    queryFn: () => userService.getTeachers(params),
  });

  const data = query.data as any;
  const teachers = data?.data && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  const meta = data?.meta || {};

  return {
    ...query,
    teachers,
    meta,
  };
};

export const useUser = (id: string | undefined) => {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => userService.getUser(id!),
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserDto) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) => 
      userService.updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useMyQrCode = () => {
  return useQuery({
    queryKey: ["users", "me", "qrcode"],
    queryFn: userService.getMyQrCode,
  });
};

export const useMe = () => {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: userService.getMe,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
};
