import { PaginationParams } from "./common";
import { User } from "./user";

export interface Event {
  id: number;
  public_id: string;
  name: string;
  description: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location: string;
  organizerId: string;
  isActive: boolean;
  affectsAttendance: boolean;
  capacity: number | null;
  isCancelled: boolean;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    public_id: string;
    name: string;
    email: string;
    phone: string | null;
    photo: string | null;
    isActive: boolean;
  };
}

export interface EventParams extends PaginationParams {
  startFrom?: string;
  startTo?: string;
  upcoming?: boolean;
  past?: boolean;
  eventType?: string;
  date?: string; // For filtered day view
  search?: string;
}

export interface CreateEventDto {
  name: string;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  eventType: string;
  capacity: number | null;
  affectsAttendance: boolean;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
  isActive?: boolean;
  isCancelled?: boolean;
  cancellationReason?: string | null;
}

export interface EventInvitation {
  id: number;
  createdAt: string;
  updatedAt: string;
  eventId: number;
  userId: string;
  status: "invited" | "accepted" | "declined" | "tentative";
  invitedAt: string | null;
  respondedAt: string | null;
  responseNotes: string | null;
  user?: User;
  event?: Event;
  attendanceStatus?: string | null;
  availabilityStatus?: "open" | "closed" | "upcoming" | "ended";
}

export interface EventInvitationParams extends PaginationParams {
  eventId?: string;
  userId?: string;
  status?: string;
}

export interface BulkInviteDto {
  userIds: string[];
}

export interface ClassInviteDto {
  classId: string;
  academicYearId: string;
}

export interface AvailableUsersParams {
  startDate: string;
  endDate: string;
  search?: string;
  limit?: number;
}
