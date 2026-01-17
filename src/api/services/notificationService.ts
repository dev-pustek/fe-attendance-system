
import axiosInstance from "../client";
import { NotificationTemplate, NotificationSetting, Notification, NotificationMeta } from "../types/notification";

const notificationService = {
  // --- Admin: Notification Templates ---

  getTemplates: async (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    return await axiosInstance.get<{ data: NotificationTemplate[]; meta: NotificationMeta }>("/notification-templates", { params });
  },

  getTemplate: async (id: number) => {
    return await axiosInstance.get<{ data: NotificationTemplate }>(`/notification-templates/${id}`);
  },

  createTemplate: async (data: Omit<NotificationTemplate, "id" | "createdAt" | "updatedAt">) => {
    return await axiosInstance.post<{ data: NotificationTemplate }>("/notification-templates", data);
  },

  updateTemplate: async (id: number, data: Partial<NotificationTemplate>) => {
    return await axiosInstance.put<{ data: NotificationTemplate }>(`/notification-templates/${id}`, data);
  },

  deleteTemplate: async (id: number) => {
    return await axiosInstance.delete(`/notification-templates/${id}`);
  },

  // --- User: Notification Settings ---

  getSettings: async () => {
    return await axiosInstance.get<{ data: NotificationSetting[] }>("/notification-settings");
  },

  updateSetting: async (templateId: number, data: { isEnabled?: boolean; preferredChannels?: string }) => {
    return await axiosInstance.patch<NotificationSetting>(`/notification-settings/${templateId}`, data);
  },

  // --- User: Notifications (Inbox) ---

  getNotifications: async (params?: { page?: number; limit?: number; status?: 'read' | 'unread' }) => {
    return await axiosInstance.get<{ data: Notification[]; meta: NotificationMeta }>("/notifications", { params });
  },

  markAsRead: async (id: string) => {
    return await axiosInstance.patch(`/notifications/${id}/read`);
  },

  markAsUnread: async (id: string) => {
    return await axiosInstance.patch(`/notifications/${id}/unread`);
  },

  markAllAsRead: async () => {
    return await axiosInstance.patch("/notifications/read-all");
  },

  createNotification: async (data: { userId?: string; title: string; message: string; channel?: string; type?: string }) => {
     return await axiosInstance.post<{ data: Notification }>("/notifications", data);
  },

  updateNotification: async (id: string, data: Partial<Notification>) => {
      return await axiosInstance.put<{ data: Notification }>(`/notifications/${id}`, data);
  },

  deleteNotification: async (id: string) => {
      return await axiosInstance.delete(`/notifications/${id}`);
  },
};

export default notificationService;
