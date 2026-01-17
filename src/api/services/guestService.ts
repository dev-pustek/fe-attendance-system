import apiClient from "../client";
import { PaginatedResponse } from "../types/common";
import { Guest, GuestVisit } from "../types";

export interface CreateGuestDto {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  purpose?: string;
  idCardNumber?: string;
  photoUrl?: File | null;
  evidenceId?: number;
}

export type UpdateGuestDto = Partial<CreateGuestDto>



export interface GuestParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface VisitParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'completed';
}

export interface CreateGuestVisitDto {
  purpose: string;
  checkInTime?: string;
  evidenceId?: number;
}

export interface UpdateGuestVisitDto {
  userId?: string | number;
  date?: string;
  clockIn?: string;
  clockOut?: string;
  statusLabel?: string;
  notes?: string;
  eventId?: number | null;
  purpose?: string;
}

export const guestService = {
  getGuests: async (params?: GuestParams): Promise<PaginatedResponse<Guest>> => {
    const response = await apiClient.get<PaginatedResponse<Guest>>("/guests", { params });
    return response.data;
  },

  getGuest: async (id: number): Promise<Guest> => {
    const response = await apiClient.get<Guest>(`/guests/${id}`);
    return response.data;
  },

  createGuest: async (data: CreateGuestDto): Promise<Guest> => {
    if (!data.photoUrl) {
      const response = await apiClient.post<Guest>("/guests", data);
      return response.data;
    }

    const formData = new FormData();
    formData.append("name", data.name);
    if (data.email) formData.append("email", data.email);
    if (data.phone) formData.append("phone", data.phone);
    if (data.company) formData.append("company", data.company);
    if (data.purpose) formData.append("purpose", data.purpose);
    if (data.idCardNumber) formData.append("idCardNumber", data.idCardNumber);
    if (data.evidenceId) formData.append("evidenceId", data.evidenceId.toString());
    formData.append("photoUrl", data.photoUrl);

    const response = await apiClient.post<Guest>("/guests", formData);
    return response.data;
  },

  updateGuest: async (id: string | number, data: UpdateGuestDto): Promise<Guest> => {
    if (!data.photoUrl || typeof data.photoUrl === "string") {
      const response = await apiClient.patch<Guest>(`/guests/${id}`, data);
      return response.data;
    }

    const formData = new FormData();
    if (data.name) formData.append("name", data.name);
    if (data.email) formData.append("email", data.email);
    if (data.phone) formData.append("phone", data.phone);
    if (data.company) formData.append("company", data.company);
    if (data.purpose) formData.append("purpose", data.purpose);
    if (data.idCardNumber) formData.append("idCardNumber", data.idCardNumber);
    if (data.evidenceId) formData.append("evidenceId", data.evidenceId.toString());
    formData.append("photoUrl", data.photoUrl);

    const response = await apiClient.patch<Guest>(`/guests/${id}`, formData);
    return response.data;
  },

  deleteGuest: async (id: number): Promise<void> => {
    await apiClient.delete(`/guests/${id}`);
  },

  // Visits
  getVisits: async (params?: VisitParams): Promise<PaginatedResponse<GuestVisit>> => {
    const response = await apiClient.get<PaginatedResponse<GuestVisit>>("/guests/visits", { params });
    return response.data;
  },

  getGuestVisits: async (public_id: string, params?: VisitParams): Promise<PaginatedResponse<GuestVisit>> => {
    const response = await apiClient.get<PaginatedResponse<GuestVisit>>(`/guests/${public_id}/visits`, { params });
    return response.data;
  },

  checkIn: async (public_id: string, data: CreateGuestVisitDto): Promise<GuestVisit> => {
    const response = await apiClient.post<GuestVisit>(`/guests/${public_id}/visits`, data);
    return response.data;
  },

  createVisit: async (data: CreateGuestDto): Promise<GuestVisit> => {
    if (!data.photoUrl) {
      const response = await apiClient.post<GuestVisit>("/guests/visits", data);
      return response.data;
    }

    const formData = new FormData();
    formData.append("name", data.name);
    if (data.email) formData.append("email", data.email);
    if (data.phone) formData.append("phone", data.phone);
    if (data.company) formData.append("company", data.company);
    if (data.purpose) formData.append("purpose", data.purpose);
    if (data.idCardNumber) formData.append("idCardNumber", data.idCardNumber);
    if (data.evidenceId) formData.append("evidenceId", data.evidenceId.toString());
    formData.append("photoUrl", data.photoUrl);

    const response = await apiClient.post<GuestVisit>("/guests/visits", formData);
    return response.data;
  },

  updateVisit: async (visitId: string | number, data: UpdateGuestVisitDto): Promise<GuestVisit> => {
    const response = await apiClient.patch<GuestVisit>(`/guests/visits/${visitId}`, data);
    return response.data;
  },

  deleteVisit: async (visitId: number): Promise<void> => {
    await apiClient.delete(`/guests/visits/${visitId}`);
  },
};
