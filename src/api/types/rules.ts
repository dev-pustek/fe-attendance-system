import { PaginationParams } from "./common";
import { AcademicYear, EducationLevel, Major, Class } from "./academic";
import { User } from "./user";

export enum RuleContextType {
  GLOBAL = "GLOBAL",
  EDUCATION_LEVEL = "EDUCATION_LEVEL",
  GRADE = "GRADE",
  MAJOR = "MAJOR",
  CLASS = "CLASS",
  USER = "USER"
}

export enum RulePurpose {
  SCHEDULE = "SCHEDULE",
  ATTENDANCE_RULE = "ATTENDANCE_RULE"
}

export interface RuleContext {
  id: number;
  contextType: RuleContextType | string;
  educationLevelId: number | null;
  gradeId: number | null;
  majorId: number | null;
  classId: number | null;
  userId: string | null;
  academicYearId: number;
  priority: number;
  purpose: RulePurpose | string;
  createdAt: string;
  educationLevel?: EducationLevel | null;
  grade?: { id: number; name: string } | null; 
  major?: Major | null;
  class?: Class | null;
  user?: User | null;
  academicYear?: AcademicYear | null;
}

export interface RuleContextParams extends PaginationParams {
  search?: string;
  contextType?: RuleContextType | string;
  purpose?: RulePurpose | string;
  academicYearId?: number | string;
}

export interface CreateRuleContextDto {
  contextType: RuleContextType | string;
  educationLevelId: number | null;
  gradeId: number | null;
  majorId: number | null;
  classId: number | null;
  userId: string | null;
  academicYearId: number;
  priority: number;
  purpose: RulePurpose | string;
}

export type UpdateRuleContextDto = Partial<CreateRuleContextDto>;

export interface ScheduleBreak {
  name: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleRule {
  id: number;
  contextId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  earlyLeaveThresholdMinutes: number;
  breaks?: ScheduleBreak[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  context?: RuleContext;
}

export interface ScheduleRuleParams extends PaginationParams {
  contextId?: number | string;
  dayOfWeek?: string;
  isActive?: boolean;
}

export interface CreateScheduleRuleDto {
  contextId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  lateToleranceMinutes: number;
  earlyLeaveThresholdMinutes: number;
  breaks?: ScheduleBreak[];
  isActive: boolean;
}

export type UpdateScheduleRuleDto = Partial<CreateScheduleRuleDto>;

export enum AttendanceRuleType {
  LATE_TOLERANCE = "LATE_TOLERANCE",
  ABSENT_THRESHOLD = "ABSENT_THRESHOLD_MIN",
  CHECKIN_WINDOW_START = "CHECKIN_WINDOW_START_MIN",
  CHECKIN_WINDOW_END = "CHECKIN_WINDOW_END_MIN",
  CHECKOUT_WINDOW_START = "CHECKOUT_WINDOW_START_MIN",
  CHECKOUT_WINDOW_END = "CHECKOUT_WINDOW_END_MIN",
  REQUIRE_PHOTO_EVIDENCE = "REQUIRE_PHOTO_EVIDENCE",
  REQUIRE_GEO_LOCATION = "REQUIRE_GEO_LOCATION",
}

export interface AttendanceRule {
  id: number;
  contextId: number;
  ruleType: AttendanceRuleType | string;
  ruleValue: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  context?: RuleContext;
}

export interface AttendanceRuleParams extends PaginationParams {
  contextId?: number | string;
  ruleType?: AttendanceRuleType | string;
  isActive?: boolean;
}

export interface CreateAttendanceRuleDto {
  contextId?: number;
  contextType?: RuleContextType | string;
  educationLevelId?: number | null;
  gradeId?: number | null;
  majorId?: number | null;
  classId?: number | null;
  userId?: string | null;
  ruleType: AttendanceRuleType | string;
  ruleValue: string;
  isActive: boolean;
}

export interface UpdateAttendanceRuleDto extends Partial<CreateAttendanceRuleDto> {
  newContextId?: number | null;
}
