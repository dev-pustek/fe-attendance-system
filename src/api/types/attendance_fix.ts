export interface ManualAttendanceDto {
  userId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  statusLabel: string;
  notes?: string;
  eventId?: string;
  latitude?: number;
  longitude?: number;
}
