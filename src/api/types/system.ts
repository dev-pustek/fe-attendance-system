export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  changes?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
    error?: string;
  } | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  statusCode: number;
  createdAt: string;
}

export interface SystemSetting {
  id: string | number;
  key: string;
  value: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
}

export interface Guest {
  id: number;
  public_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  idCardNumber?: string | null;
  photoUrl?: string | null;
  isBlacklisted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuestVisit {
  id: number;
  guestId: string;
  hostUserId?: string | null;
  visitDate: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: "scheduled" | "active" | "completed" | string;
  purpose?: string | null;
  meta?: Record<string, unknown> | null;
  guest?: Guest;
  createdAt: string;
  updatedAt: string;
  checkInTime?: string; // Legacy field for backwards compatibility if needed
  checkOutTime?: string | null; // Legacy field
  evidenceId?: number | null; // Legacy field
}

export interface AuditStats {
  trafficByDay: { date: string; count: number }[];
  statusDistribution: { status: number; count: number }[];
  actionDistribution: { action: string; count: number }[];
  topResources: { resource: string; count: number }[];
  securityAlerts: { ip: string; count: number }[];
}
