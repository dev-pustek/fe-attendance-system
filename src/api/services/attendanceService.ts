import { PaginatedResponse, ApiResponse } from "../types/common";
import {
  AttendanceRecord,
  AttendanceEvent,
  AttendanceRule,
  AttendanceRuleContext,
  AttendanceStatus,
  AttendanceParams,
  AttendanceEventParams,
  AttendanceRuleParams,
  AttendanceRuleContextParams,
  ManualAttendanceDto,
  QrScanDto,
  CheckInOutDto,
  TeachingSession,
  TeachingSessionParams,
  CreateTeachingSessionDto,
  UpdateTeachingSessionDto,
  SubjectAttendance,
  SubjectAttendanceParams,
  CreateSubjectAttendanceDto,
  UpdateSubjectAttendanceDto,
  BulkCreateSubjectAttendanceDto,
  GroupedTeachingSessionResponse,
  UserPolicyResponse,
  TodayScheduleResponse,
  GateMetrics,
  SubjectMetrics,
  EventMetrics
} from "../types/attendance";
import apiClient from "../client";


// Note: Based on user request, some paths are /attendance/admin/all, some are /attendance-events, etc.
// I will map them exactly as requested.

export const attendanceService = {
  // 1. Attendance List: /api/v1/attendance/admin/all
  // Attendance Records
  getAttendanceList: async (params?: AttendanceParams): Promise<PaginatedResponse<AttendanceRecord>> => {
    const response = await apiClient.get<PaginatedResponse<AttendanceRecord>>("/attendance/admin/all", { params });
    return response.data;
  },

  getAttendanceRecordById: async (id: number | string): Promise<ApiResponse<AttendanceRecord>> => {
      const response = await apiClient.get<ApiResponse<AttendanceRecord>>(`/attendance/records/${id}`);
      return response.data;
  },

  createAttendanceRecord: async (data: Partial<AttendanceRecord>): Promise<ApiResponse<AttendanceRecord>> => {
      const response = await apiClient.post<ApiResponse<AttendanceRecord>>("/attendance/records", data);
      return response.data;
  },

  updateAttendanceRecord: async (id: number | string, data: Partial<AttendanceRecord>): Promise<ApiResponse<AttendanceRecord>> => {
      const response = await apiClient.patch<ApiResponse<AttendanceRecord>>(`/attendance/records/${id}`, data);
      return response.data;
  },

  deleteAttendanceRecord: async (id: number | string): Promise<void> => {
      await apiClient.delete(`/attendance/records/${id}`);
  },

  createManualAttendance: async (data: FormData): Promise<ApiResponse<AttendanceRecord>> => {
      const response = await apiClient.post<ApiResponse<AttendanceRecord>>("/attendance/admin/manual", data, {
          headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data;
  },

  updateManualAttendance: async (id: number | string, data: Partial<ManualAttendanceDto>): Promise<ApiResponse<AttendanceRecord>> => {
      const response = await apiClient.patch<ApiResponse<AttendanceRecord>>(`/attendance/admin/${id}`, data);
      return response.data;
  },

  getPiketMonitorData: async (query: { 
    limit?: number; 
    page?: number;
    search?: string;
    classId?: number;
    majorId?: number;
    grade?: string;
    isLate?: boolean;
  }): Promise<PaginatedResponse<AttendanceRecord>> => {
      // GET /attendance/piket with query params
      const response = await apiClient.get<PaginatedResponse<AttendanceRecord>>('/attendance/piket', { params: query });
      return response.data;
  },

  qrScanAttendance: async (data: QrScanDto): Promise<ApiResponse<AttendanceRecord>> => {
      const response = await apiClient.post<ApiResponse<AttendanceRecord>>("/attendance/qr-scan", data);
      return response.data;
  },

  checkIn: async (data: CheckInOutDto): Promise<ApiResponse<AttendanceRecord>> => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
              if (value instanceof Blob) {
                  formData.append(key, value);
              } else {
                  formData.append(key, String(value));
              }
          }
      });
      const response = await apiClient.post<ApiResponse<AttendanceRecord>>("/attendance/check-in", formData, {
          headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data;
  },

  checkOut: async (data: CheckInOutDto): Promise<ApiResponse<AttendanceRecord>> => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
              if (value instanceof Blob) {
                  formData.append(key, value);
              } else {
                  formData.append(key, String(value));
              }
          }
      });
      const response = await apiClient.post<ApiResponse<AttendanceRecord>>("/attendance/check-out", formData, {
          headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data;
  },

  // 2. Attendance Events: /api/v1/attendance-events
  getAttendanceEvents: async (params?: AttendanceEventParams): Promise<PaginatedResponse<AttendanceEvent>> => {
    const response = await apiClient.get<PaginatedResponse<AttendanceEvent>>("/attendance-events", { params });
    return response.data;
  },

  getAttendanceEventById: async (id: number | string): Promise<ApiResponse<AttendanceEvent>> => {
      const response = await apiClient.get<ApiResponse<AttendanceEvent>>(`/attendance-events/${id}`);
      return response.data;
  },

  createAttendanceEvent: async (data: Partial<AttendanceEvent>): Promise<ApiResponse<AttendanceEvent>> => {
      const response = await apiClient.post<ApiResponse<AttendanceEvent>>("/attendance-events", data);
      return response.data;
  },

  updateAttendanceEvent: async (id: number | string, data: Partial<AttendanceEvent>): Promise<ApiResponse<AttendanceEvent>> => {
      const response = await apiClient.patch<ApiResponse<AttendanceEvent>>(`/attendance-events/${id}`, data);
      return response.data;
  },

  deleteAttendanceEvent: async (id: number | string): Promise<void> => {
      await apiClient.delete(`/attendance-events/${id}`);
  },

  // 3. Attendance Rules: /api/v1/attendance-rules
  getAttendanceRules: async (params?: AttendanceRuleParams): Promise<PaginatedResponse<AttendanceRule>> => {
    const response = await apiClient.get<PaginatedResponse<AttendanceRule>>("/attendance-rules", { params });
    return response.data;
  },

  createAttendanceRule: async (data: Partial<AttendanceRule>): Promise<ApiResponse<AttendanceRule>> => {
      const response = await apiClient.post<ApiResponse<AttendanceRule>>("/attendance-rules", data);
      return response.data;
  },

  updateAttendanceRule: async (id: number | string, data: Partial<AttendanceRule>): Promise<ApiResponse<AttendanceRule>> => {
      const response = await apiClient.patch<ApiResponse<AttendanceRule>>(`/attendance-rules/${id}`, data);
      return response.data;
  },

  deleteAttendanceRule: async (id: number | string): Promise<void> => {
      await apiClient.delete(`/attendance-rules/${id}`);
  },

  // 4. Attendance Rule Contexts: /api/v1/attendance-rule-contexts
  getAttendanceRuleContexts: async (params?: AttendanceRuleContextParams): Promise<PaginatedResponse<AttendanceRuleContext>> => {
    const response = await apiClient.get<PaginatedResponse<AttendanceRuleContext>>("/attendance-rule-contexts", { params });
    return response.data;
  },

  createAttendanceRuleContext: async (data: Partial<AttendanceRuleContext>): Promise<ApiResponse<AttendanceRuleContext>> => {
      const response = await apiClient.post<ApiResponse<AttendanceRuleContext>>("/attendance-rule-contexts", data);
      return response.data;
  },

  updateAttendanceRuleContext: async (id: number | string, data: Partial<AttendanceRuleContext>): Promise<ApiResponse<AttendanceRuleContext>> => {
      const response = await apiClient.patch<ApiResponse<AttendanceRuleContext>>(`/attendance-rule-contexts/${id}`, data);
      return response.data;
  },

  deleteAttendanceRuleContext: async (id: number | string): Promise<void> => {
      await apiClient.delete(`/attendance-rule-contexts/${id}`);
  },

  // 5. Attendance Statuses: /api/v1/attendance-statuses
  getAttendanceStatuses: async (): Promise<ApiResponse<AttendanceStatus[]>> => {
    const response = await apiClient.get<ApiResponse<AttendanceStatus[]>>("/attendance-statuses");
    return response.data;
  },

  createAttendanceStatus: async (data: Partial<AttendanceStatus>): Promise<ApiResponse<AttendanceStatus>> => {
      const response = await apiClient.post<ApiResponse<AttendanceStatus>>("/attendance-statuses", data);
      return response.data;
  },

  updateAttendanceStatus: async (id: number | string, data: Partial<AttendanceStatus>): Promise<ApiResponse<AttendanceStatus>> => {
      const response = await apiClient.patch<ApiResponse<AttendanceStatus>>(`/attendance-statuses/${id}`, data);
      return response.data;
  },

  deleteAttendanceStatus: async (id: number | string): Promise<void> => {
      await apiClient.delete(`/attendance-statuses/${id}`);
  },

  // 6. Teaching Sessions: /api/v1/attendance/teaching-sessions
  getTeachingSessions: async (params?: TeachingSessionParams): Promise<PaginatedResponse<TeachingSession>> => {
    const response = await apiClient.get<PaginatedResponse<TeachingSession>>("/attendance/teaching-sessions", { params });
    return response.data;
  },

  createTeachingSession: async (data: CreateTeachingSessionDto): Promise<ApiResponse<TeachingSession>> => {
    const response = await apiClient.post<ApiResponse<TeachingSession>>("/attendance/teaching-sessions", data);
    return response.data;
  },

  updateTeachingSession: async (id: number | string, data: UpdateTeachingSessionDto): Promise<ApiResponse<TeachingSession>> => {
    const response = await apiClient.patch<ApiResponse<TeachingSession>>(`/attendance/teaching-sessions/${id}`, data);
    return response.data;
  },

  deleteTeachingSession: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/attendance/teaching-sessions/${id}`);
  },

  getGroupedTeachingSessions: async (params?: TeachingSessionParams): Promise<ApiResponse<GroupedTeachingSessionResponse>> => {
    const response = await apiClient.get<ApiResponse<GroupedTeachingSessionResponse>>("/attendance/teaching-sessions/grouped", { params });
    return response.data;
  },

  // 7. Subject Attendances: /api/v1/attendance/subject-attendances
  getSubjectAttendances: async (params?: SubjectAttendanceParams): Promise<PaginatedResponse<SubjectAttendance>> => {
    const response = await apiClient.get<PaginatedResponse<SubjectAttendance>>("/attendance/subject-attendances", { params });
    return response.data;
  },

  createSubjectAttendance: async (data: CreateSubjectAttendanceDto): Promise<ApiResponse<SubjectAttendance>> => {
    const response = await apiClient.post<ApiResponse<SubjectAttendance>>("/attendance/subject-attendances", data);
    return response.data;
  },

  updateSubjectAttendance: async (id: number | string, data: UpdateSubjectAttendanceDto): Promise<ApiResponse<SubjectAttendance>> => {
    const response = await apiClient.patch<ApiResponse<SubjectAttendance>>(`/attendance/subject-attendances/${id}`, data);
    return response.data;
  },

  deleteSubjectAttendance: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/attendance/subject-attendances/${id}`);
  },

  bulkCreateSubjectAttendance: async (data: BulkCreateSubjectAttendanceDto): Promise<void> => {
    await apiClient.post("/attendance/subject-attendances/bulk", data);
  },

  scanQRCode: async (data: { qrData: string, deviceId: string }): Promise<any> => {
    const response = await apiClient.post('/attendance/qr-scan', data);
    return response.data;
  },

  getAttendancePolicy: async (userId: string): Promise<ApiResponse<UserPolicyResponse>> => {
      const response = await apiClient.get<ApiResponse<UserPolicyResponse>>(`/attendance/policy/${userId}`);
      return response.data;
  },

  getTodaySchedule: async (teacherId: string): Promise<TodayScheduleResponse> => {
    const response = await apiClient.get<TodayScheduleResponse>("/attendance/teaching-sessions/today", {
      params: { teacherId }
    });
    return response.data;
  },

  getStudentTodaySchedule: async (studentId: string): Promise<TodayScheduleResponse> => {
    // Note: The endpoint requests /attendance/teaching-sessions/my-schedule
    // studentId might be redundant if the token handles it, but keeping it as param if needed
    const response = await apiClient.get<TodayScheduleResponse>("/attendance/teaching-sessions/my-schedule", {
      params: { studentId }
    });
    return response.data;
  },

  // Attendance History endpoints
  getAttendanceHistory: async (params?: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    classId?: number;
    academicYearId?: number;
    majorId?: number;
    status?: string;
    eventId?: string;
  }): Promise<PaginatedResponse<AttendanceRecord> & { metrics: GateMetrics }> => {
    const response = await apiClient.get<PaginatedResponse<AttendanceRecord> & { metrics: GateMetrics }>("/attendance/history", { 
      params 
    });
    return response.data;
  },

  downloadSubjectAttendanceReport: async (params: { 
    classId: number; 
    startDate: string; 
    endDate: string;
    subjectId?: number;
  }): Promise<Blob> => {
      const response = await apiClient.get("/attendance/subject-attendances/report", {
          params,
          responseType: "blob",
      });
      return response.data;
  },

  getSubjectAttendanceHistory: async (params?: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    academicYearId?: number;
    subjectId?: number;
    teachingSessionId?: number;
    status?: string;
  }): Promise<PaginatedResponse<SubjectAttendance> & { metrics: SubjectMetrics }> => {
    const response = await apiClient.get<PaginatedResponse<SubjectAttendance> & { metrics: SubjectMetrics }>("/attendance/subject-attendances/my-history", { 
      params 
    });
    return response.data;
  },

  getMyEvents: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    eventId?: string;
    upcoming?: boolean;
    past?: boolean;
  }): Promise<PaginatedResponse<any> & { metrics: EventMetrics }> => {
    const response = await apiClient.get<PaginatedResponse<any> & { metrics: EventMetrics }>("/events/my-events", { 
      params 
    });
    return response.data;
  }
};
