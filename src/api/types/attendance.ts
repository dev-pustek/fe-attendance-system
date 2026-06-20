import { PaginationParams } from "./common";
import { User } from "./user";
import { IdentityCaptureLog, IdentityResolution } from "./identity";

// --- Enums ---
export enum AttendanceEventType {
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT"
}

export enum AttendanceRuleType {
  LATE_TOLERANCE = "LATE_TOLERANCE",
  ABSENT_THRESHOLD_MIN = "ABSENT_THRESHOLD_MIN",
  EARLY_LEAVE_TOLERANCE = "EARLY_LEAVE_TOLERANCE"
}

export enum AttendanceContextType {
  GLOBAL = "GLOBAL",
  USER_GROUP = "USER_GROUP",
  USER = "USER"
}

export enum AttendanceStatusCode {
  PRESENT = "PRESENT",
  LATE = "LATE",
  ABSENT = "ABSENT",
  EXCUSED = "EXCUSED",
  SICK = "SICK"
}

// --- Entities ---

export interface AttendanceStatus {
  id: number;
  code: AttendanceStatusCode | string;
  name: string;
  description?: string;
}

export interface AttendanceRecord {
  public_id?: string;
  userId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  isLate: boolean;
  isEarlyLeave?: boolean;
  isOvertime?: boolean;
  lateMinutes: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  firstEventId?: string | null;
  lastEventId?: string | null;
  statusId?: number | null;
  classId?: number | string | null;
  academicYearId?: number | string | null;
  statusLabel?: string;
  isPresent?: boolean;
  method?: string;
  notes?: string | null;
  photoUrl?: string | null;
  photoEvidenceUrl?: string | null;
  photoOutUrl?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // New fields from updated API
  studentName?: string;
  studentEmail?: string;
  studentProfile?: {
    nis: string;
    nisn: string;
    studentIdentificationNumber?: string;
    gender: string;
    placeOfBirth: string;
    dateOfBirth: string;
  };
  // Legacy field
  user?: User;
  status?: {
    id: number;
    code: string;
    name: string;
  };
  class?: {
    id: number;
    code?: string;
    name: string;
  };
  academicYear?: {
    id: number;
    code: string;
    name: string;
  };
  major?: {
    id: number;
    name: string;
    code: string;
  };
  attendancePolicy?: AttendancePolicy;
  event?: {
    id: number;
    public_id: string;
    name: string;
    eventType: string;
    startTime: string;
    endTime: string;
  };
  eventId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AttendancePolicy {
  startTime: string;
  endTime: string;
  lateTolerance: number;
  source: string;
  dayOfWeek?: string;
}

export interface AttendanceEvent {
  id: string;
  captureLogId: string;
  resolutionId: string;
  resolvedUserId: string;
  resolutionStatusSnapshot: string;
  attendanceDate: string;
  eventTime: string;
  eventType: AttendanceEventType | string;
  createdAt: string;
  // Nested Objects
  captureLog?: IdentityCaptureLog;
  resolution?: IdentityResolution;
  resolvedUser?: User;
  
  // Computed/Frontend-Only helpers (optional, but keeping generic prop names is good if we map them)
  // For backwards compatibility or ease of use, we might map these in a transform layer, 
  // but for raw API types, it's best to match exactly.
  // I will rely on the component to use the nested props.
}

export interface AttendanceRule {
  id: number;
  contextId: number;
  ruleType: AttendanceRuleType | string;
  ruleValue: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  context?: AttendanceRuleContext;
}

export interface AttendanceRuleContext {
  id: number;
  contextType: AttendanceContextType | string;
  targetUuid: string;
  contextValue?: string;
  academicYearId: number;
  priority: number;
  createdAt: string;
  academicYear?: {
    id: number;
    code: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  rules?: AttendanceRule[];
}

// --- DTOs & Params ---

export interface AttendanceParams extends PaginationParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  statusId?: number;
  classId?: string | number;
  academicYearId?: string | number;
  eventId?: string | number;
  method?: string;
  isLate?: boolean;
  isEarlyLeave?: boolean;
  isOvertime?: boolean;
  lateMinutes?: number | string;
  earlyLeaveMinutes?: number | string;
  overtimeMinutes?: number | string;
  type?: "DAILY" | "CLASS" | string;
  majorId?: string | number;
}

export interface AttendanceEventParams extends PaginationParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  eventType?: AttendanceEventType | string;
  type?: string; // Alias for eventType in filtering
  deviceId?: number;
}

export interface AttendanceRuleParams extends PaginationParams {
  contextType?: AttendanceContextType | string;
}

export interface AttendanceRuleContextParams extends PaginationParams {
  academicYearId?: number;
  priority?: number;
  contextValue?: string;
}

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

export interface QrScanDto {
  qrData: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  classId?: number;
  eventId?: string;
}

export interface CheckInOutDto {
  deviceId: string;
  latitude: number;
  longitude: number;
  photo?: File | Blob;
  qrCode?: string;
  method: string;
  manualCreatorId?: string;
  notes?: string;
  eventId?: string;
  classId?: number;
}

// --- Teaching Sessions ---

export interface TeachingSession {
  id: string | number;
  classSubjectId: number;
  actualTeacherId: string;
  substituteForTeacherId: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  teachingUnits: number;
  periodInfo?: string;
  isSubstitution: boolean;
  isCancelled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  classSubject?: {
    id: number;
    classId: number;
    subjectId: number;
    academicYearId: number;
    plannedTotalUnits: number;
    plannedUnitsPerWeek: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    class?: {
      id: number;
      code: string;
      name: string;
      gradeId: number;
      academicYearId: number;
      isActive: boolean;
    };
    subject?: {
      id: number;
      code: string;
      name: string;
      isActive: boolean;
    };
  };
  actualTeacher?: User;
  substituteForTeacher?: User | null;
  // Piket validation fields
  validationStatus?: 'pending' | 'valid' | 'invalid' | string;
  validatedById?: string | null;
  validationNotes?: string | null;
  validatedBy?: User | null;
  status?: "scheduled" | "in_progress" | "completed" | string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
}

export interface TeachingSessionParams extends PaginationParams {
  classSubjectId?: number;
  actualTeacherId?: string;
  sessionDate?: string;
  startDate?: string;
  endDate?: string;
  isCancelled?: boolean;
}

export interface CreateTeachingSessionDto {
  classSubjectId: number;
  actualTeacherId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  teachingUnits?: number;
  periodInfo?: string;
  isSubstitution?: boolean;
  substituteForTeacherId?: string | null;
  isCancelled?: boolean;
  notes?: string;
}

export type UpdateTeachingSessionDto = Partial<CreateTeachingSessionDto>;

export interface SubjectAttendance {
  id: string | number;
  teachingSessionId: string | number;
  studentId: string;
  status: "present" | "absent" | "late" | "excused" | "sick";
  method?: "manual" | "qr" | "face" | string;
  recordedAt: string;
  remarks: string | null;
  createdAt?: string;
  updatedAt?: string;
  teachingSession?: TeachingSession;
  student?: User;
}

export interface SubjectAttendanceParams extends PaginationParams {
  academicYearId?: number | string;
  classId?: number | string;
  subjectId?: number | string;
  teacherId?: string;
  startDate?: string;
  endDate?: string;

  teachingSessionId?: string | number;
  studentId?: string;
  status?: string;
}

export interface CreateSubjectAttendanceDto {
  teachingSessionId: string | number;
  studentId: string;
  status: "present" | "absent" | "late" | "excused" | "sick";
  remarks?: string;
  method?: "qr" | "manual" | "biometric";
  latitude?: number;
  longitude?: number;
}

export type UpdateSubjectAttendanceDto = Partial<CreateSubjectAttendanceDto>;

export interface BulkCreateSubjectAttendanceDto {
  teachingSessionId: string | number;
  records: {
    studentId: string;
    status: "present" | "absent" | "late" | "excused" | "sick";
    remarks?: string;
  }[];
}

export type GroupedTeachingSessionResponse = Record<string, Record<string, TeachingSession[]>>;


export interface UserPolicyResponse {
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto: string | null;
  studentProfile?: {
    nis: string;
    nisn: string;
    studentIdentificationNumber?: string;
    gender: string;
    placeOfBirth: string;
    dateOfBirth: string;
  };
  class?: {
    id: number;
    name: string;
  };
  major?: {
    id: number;
    name: string;
    code: string;
  };
  grade?: {
    id: number;
    name: string;
    code: string;
  };
  educationLevel?: {
    id: number;
    name: string;
    code: string;
  };
  academicYear?: {
    id: number;
    code: string;
    name: string;
  };
  attendancePolicy: AttendancePolicy;
  holiday?: {
    isHoliday: boolean;
    name: string;
  };
  rules?: {
    ruleType: AttendanceRuleType | string;
    ruleValue: unknown;
  }[];
  todayStatus?: {
    clockIn: string | null;
    clockOut: string | null;
    isLate: boolean;
    statusLabel: string;
  };
  date: string;
}

export interface TodayScheduleItem {
  type: "template" | "session";
  status: "SCHEDULED" | "CREATED" | "COMPLETED" | string;
  sessionStatus?: "ONGOING" | "COMPLETED" | "SCHEDULED" | string;
  isAttendanceTaken?: boolean;
  isCompleted?: boolean;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  classSubjectId: number;
  templateId?: number;
  sessionId?: number | string | null;
  teacherName?: string;
  myAttendanceTime?: string | null;
  myAttendanceStatus?: "present" | "late" | "absent" | "excused" | string;
  // Detailed session info based on actual API response
  session?: {
    id: number | string;
    classSubjectId: number;
    actualTeacherId: string;
    substituteForTeacherId?: string | null;
    sessionDate: string;
    startTime: string;
    endTime: string;
    teachingUnits: number;
    isSubstitution: boolean;
    isCancelled: boolean;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    classSubject?: {
      id: number;
      classId: number;
      subjectId: number;
      academicYearId: number;
      plannedTotalUnits: number;
      plannedUnitsPerWeek: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
      class?: {
        id: number;
        code: string;
        name: string;
        gradeId: number;
        majorId?: number | null;
        homeroomTeacherId?: string | null;
        academicYearId: number;
        roomNumber?: string;
        maxCapacity: number;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
      };
      subject?: {
        id: number;
        majorId?: number | null;
        gradeId?: number | null;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
      };
    };
    subjectAttendances?: SubjectAttendance[];
  };
  // Keeping 'data' for backward compatibility if needed, but defining it as the session object
  data?: any; 
}

export interface TodayScheduleResponse {
  data: TodayScheduleItem[];
}

export interface GateMetrics {
  totalDays: number;
  presentCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  absentCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface SubjectMetrics {
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendancePercentage: number;
}

export interface EventMetrics {
  totalEvents: number;
  attendedCount: number;
  missedCount: number;
}
