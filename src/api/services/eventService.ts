import apiClient from "../client";
import { PaginatedResponse } from "../types/common";
import { 
  Event, 
  EventParams, 
  CreateEventDto, 
  UpdateEventDto, 
  EventInvitation, 
  EventInvitationParams,
  BulkInviteDto,
  ClassInviteDto,
  AvailableUsersParams
} from "../types/events";
import { User } from "../types/user";

export const eventService = {
  getEvents: async (params?: EventParams): Promise<PaginatedResponse<Event>> => {
    const response = await apiClient.get<PaginatedResponse<Event>>("/events", { params });
    return response.data;
  },

  getEvent: async (id: string): Promise<Event> => {
    const response = await apiClient.get<Event>(`/events/${id}`);
    return response.data;
  },

  createEvent: async (data: CreateEventDto): Promise<Event> => {
    const response = await apiClient.post<Event>("/events", data);
    return response.data;
  },

  updateEvent: async (id: string, data: UpdateEventDto): Promise<Event> => {
    const response = await apiClient.patch<Event>(`/events/${id}`, data);
    return response.data;
  },

  deleteEvent: async (id: string): Promise<void> => {
    await apiClient.delete(`/events/${id}`);
  },

  cancelEvent: async (id: string): Promise<Event> => {
    const response = await apiClient.patch<Event>(`/events/${id}/cancel`);
    return response.data;
  },

  getInvitations: async (eventId: string, params?: EventInvitationParams): Promise<PaginatedResponse<EventInvitation>> => {
    const response = await apiClient.get<PaginatedResponse<EventInvitation>>(`/events/${eventId}/invitations`, { params });
    return response.data;
  },

  bulkInvite: async (eventId: string, data: BulkInviteDto): Promise<void> => {
    await apiClient.post(`/events/${eventId}/invitations/bulk`, data);
  },

  inviteClass: async (eventId: string, data: ClassInviteDto): Promise<void> => {
    const response = await apiClient.post<{ data: { successCount: number; errors: string[] } }>(`/events/${eventId}/invitations/class`, data);
    
    const result = response.data?.data;
    if (result) {
        if (result.successCount === 0 && result.errors && result.errors.length > 0) {
            throw new Error(result.errors[0]); // Throw the first error message (e.g., "No students found")
        }
    }
  },

  getAvailableUsers: async (params: AvailableUsersParams): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[]; meta?: Record<string, unknown> }>("/events/available-users", { params });
    return response.data.data || [];
  },

  deleteInvitation: async (eventId: string, invitationId: string): Promise<void> => {
    await apiClient.delete(`/events/${eventId}/invitations/${invitationId}`);
  },

  getUserInvitations: async (userId: string, params?: EventInvitationParams): Promise<PaginatedResponse<EventInvitation>> => {
    const response = await apiClient.get<PaginatedResponse<EventInvitation>>(`/events/users/${userId}/invitations`, { params });
    return response.data;
  },

  respondToInvitation: async (invitationId: string | number, data: { status: string; responseNotes?: string }): Promise<void> => {
    await apiClient.patch(`/events/invitations/${invitationId}/respond`, data);
  },

  setScannerAccess: async (eventId: string | number, invitationId: string | number, isScanner: boolean): Promise<void> => {
    await apiClient.patch(`/events/${eventId}/invitations/${invitationId}/scanner`, { isScanner });
  },

  respondToEventByEventId: async (eventId: string | number, data: { status: string; responseNotes?: string }): Promise<void> => {
    await apiClient.patch(`/events/${eventId}/my-response`, data);
  },
};
