export interface ShiftTemplate {
  public_id: string;
  name: string;
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  earlyDepartureToleranceMinutes: number;
  workDays: number[]; // Integers 1 (Monday) to 7 (Sunday)
  effectiveDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftTemplateParams {
  search?: string;
  day?: number;
  shiftPeriod?: 'morning' | 'afternoon' | 'evening';
  type?: 'permanent' | 'scheduled';
  page?: number | string;
  limit?: number | string;
}

import { User } from "./user";

export interface ShiftAssignment {
  id: string;
  userId: string;
  shiftTemplateId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  user?: User;
  shiftTemplate?: ShiftTemplate;
}

export interface ShiftAssignmentParams {
  page?: number | string;
  limit?: number | string;
  userId?: string;
  shiftTemplateId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}
