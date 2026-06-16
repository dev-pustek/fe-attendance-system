import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import notificationService from "../services/notificationService";
import { Notification } from "../types/notification";

export const useNotifications = (params?: { page?: number; limit?: number; status?: 'read' | 'unread' | '' }) => {
  const queryClient = useQueryClient();

  // Strip empty status to avoid sending empty string
  const cleanParams = { ...params };
  if (cleanParams.status === '') {
      delete cleanParams.status;
  }

  const query = useQuery({
    queryKey: ["notifications", cleanParams],
    queryFn: () => notificationService.getNotifications(cleanParams),
  });

  const createMutation = useMutation({
    mutationFn: (data: { userId?: string; title: string; message: string; channel?: string; type?: string }) =>
      notificationService.createNotification(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Notification> }) =>
      notificationService.updateNotification(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useNotificationsInfinite = (params?: { status?: 'read' | 'unread' | '' }) => {
  const cleanParams = { ...params };
  if (cleanParams.status === '') {
      delete cleanParams.status;
  }

  return useInfiniteQuery({
    queryKey: ["notifications", "infinite", cleanParams],
    queryFn: ({ pageParam = 1 }) =>
      notificationService.getNotifications({ ...cleanParams, page: pageParam as number, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.data?.meta || lastPage?.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

export const useMarkNotificationUnread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsUnread(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
};
