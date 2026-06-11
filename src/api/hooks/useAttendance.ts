import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { attendanceService } from "../services/attendanceService";
import { 
  AttendanceParams, 
  AttendanceEventParams, 
  AttendanceRuleParams, 
  ManualAttendanceDto, 
  QrScanDto, 
  CheckInOutDto, 
  AttendanceRecord, 
  AttendanceRule, 
  AttendanceRuleContext,
  AttendanceRuleContextParams,
  AttendanceStatus,
  TeachingSessionParams,
  CreateTeachingSessionDto,
  UpdateTeachingSessionDto,
  SubjectAttendanceParams,
  CreateSubjectAttendanceDto,
  UpdateSubjectAttendanceDto,
  BulkCreateSubjectAttendanceDto
} from "../types/attendance";

// Records
export const useAttendanceList = (params?: AttendanceParams) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["attendance-list", params],
    queryFn: () => attendanceService.getAttendanceList(params),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AttendanceRecord>) => attendanceService.createAttendanceRecord(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-list"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<AttendanceRecord> }) => attendanceService.updateAttendanceRecord(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-list"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteAttendanceRecord(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-list"] }),
  });

  const createManualMutation = useMutation({
    mutationFn: (data: FormData) => attendanceService.createManualAttendance(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-list"] }),
  });

  const updateManualMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<ManualAttendanceDto> }) => attendanceService.updateManualAttendance(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-list"] }),
  });

  const qrScanMutation = useMutation({
    mutationFn: (data: QrScanDto) => attendanceService.qrScanAttendance(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-list"] }),
  });

  const checkInMutation = useMutation({
    mutationFn: (data: CheckInOutDto) => attendanceService.checkIn(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-list"] }),
  });

  const checkOutMutation = useMutation({
    mutationFn: (data: CheckInOutDto) => attendanceService.checkOut(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-list"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation, createManualMutation, updateManualMutation, qrScanMutation, checkInMutation, checkOutMutation };
};

// Events
export const useAttendanceEvents = (params?: AttendanceEventParams) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["attendance-events", params],
    queryFn: () => attendanceService.getAttendanceEvents(params),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AttendanceRecord>) => attendanceService.createAttendanceEvent(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-events"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<AttendanceRecord> }) => attendanceService.updateAttendanceEvent(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-events"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteAttendanceEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-events"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

// Rules
export const useAttendanceRules = (params?: AttendanceRuleParams) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["attendance-rules", params],
    queryFn: () => attendanceService.getAttendanceRules(params),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AttendanceRule>) => attendanceService.createAttendanceRule(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-rules"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<AttendanceRule> }) => attendanceService.updateAttendanceRule(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteAttendanceRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-rules"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

// Contexts
export const useAttendanceRuleContexts = (params?: AttendanceRuleContextParams) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["attendance-rule-contexts", params],
    queryFn: () => attendanceService.getAttendanceRuleContexts(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AttendanceRuleContext>) => attendanceService.createAttendanceRuleContext(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-rule-contexts"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<AttendanceRuleContext> }) => attendanceService.updateAttendanceRuleContext(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-rule-contexts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteAttendanceRuleContext(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-rule-contexts"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

// Statuses
export const useAttendanceStatuses = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["attendance-statuses"],
    queryFn: () => attendanceService.getAttendanceStatuses(),
    staleTime: 60 * 60 * 1000, 
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<AttendanceStatus>) => attendanceService.createAttendanceStatus(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-statuses"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<AttendanceStatus> }) => attendanceService.updateAttendanceStatus(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-statuses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteAttendanceStatus(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-statuses"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

// Teaching Sessions
export const useTeachingSessions = (params?: TeachingSessionParams) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["teaching-sessions", params],
    queryFn: () => attendanceService.getTeachingSessions(params),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTeachingSessionDto) => attendanceService.createTeachingSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching-sessions"] });
      // Also invalidate attendance list since teaching sessions affect attendance
      queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateTeachingSessionDto }) => attendanceService.updateTeachingSession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteTeachingSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teaching-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-list"] });
    },
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useGroupedTeachingSessions = (params?: TeachingSessionParams) => {
  return useQuery({
    queryKey: ["grouped-teaching-sessions", params],
    queryFn: () => attendanceService.getGroupedTeachingSessions(params),
  });
};

// Subject Attendances
export const useSubjectAttendancesInfinite = (params?: SubjectAttendanceParams) => {
  return useInfiniteQuery({
    queryKey: ["subject-attendances", "infinite", params],
    queryFn: ({ pageParam = 1 }) => attendanceService.getSubjectAttendances({ ...params, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      return meta?.page < meta?.totalPages ? meta.page + 1 : undefined;
    },
  });
};

export const useSubjectAttendances = (params?: SubjectAttendanceParams) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["subject-attendances", params],
    queryFn: () => attendanceService.getSubjectAttendances(params),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSubjectAttendanceDto) => attendanceService.createSubjectAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-attendances"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateSubjectAttendanceDto }) => attendanceService.updateSubjectAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-attendances"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteSubjectAttendance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-attendances"] });
    },
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};


export const useBulkSubjectAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkCreateSubjectAttendanceDto) => attendanceService.bulkCreateSubjectAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-attendances"] });
    },
  });
};

export const useTodaySchedule = (teacherId?: string) => {
  return useQuery({
    queryKey: ["today-schedule", teacherId],
    queryFn: () => attendanceService.getTodaySchedule(teacherId!),
    enabled: !!teacherId,
  });
};



export const useStudentTodaySchedule = (studentId?: string) => {
  return useQuery({
    queryKey: ["student-today-schedule", studentId],
    queryFn: () => attendanceService.getStudentTodaySchedule(studentId!),
    enabled: !!studentId,
  });
};

export const useAttendancePolicy = (userId?: string) => {
  return useQuery({
    queryKey: ["attendance-policy", userId],
    queryFn: () => attendanceService.getAttendancePolicy(userId!),
    enabled: !!userId,
  });
};



export const useClassroomCommand = () => {
  return useQuery({
    queryKey: ['classroom-command'],
    queryFn: () => attendanceService.getClassroomCommand(),
  });
};

export const useValidateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: number | string; status: 'valid' | 'invalid'; notes?: string }) => 
      attendanceService.validateSession(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-command'] });
      queryClient.invalidateQueries({ queryKey: ['today-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-teaching-sessions'] });
    },
  });
};
