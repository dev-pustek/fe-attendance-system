// ─── Analytics Types ────────────────────────────────────────────────────────
// Role-based metrics response types for /analytics/metrics endpoint

// ─── Shared ─────────────────────────────────────────────────────────────────
export interface MetricsQueryParams {
  startDate?: string;
  endDate?: string;
  classId?: number | string;
  academicYearId?: number | string;
  teacherId?: string;
}

export type MetricsRole = 'admin' | 'teacher' | 'curriculum' | 'piket' | 'staff' | 'student';

export interface MetricsResponse<T = unknown> {
  role: MetricsRole;
  data: T;
}

// ─── Admin Metrics ──────────────────────────────────────────────────────────
export interface AdminOverview {
  totalUsers: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  attendanceRate: number;
  avgLateMinutes: number;
}

export interface DailyTrendItem {
  date: string;
  present: number;
  late: number;
  absent: number;
}

export interface ClassComparisonItem {
  classId: number;
  className: string;
  present: number;
  late: number;
  absent: number;
  rate: number;
}

export interface DayOfWeekItem {
  day: string;
  present: number;
  late: number;
  absent: number;
}

export interface ClockInDistributionItem {
  hour: string;
  count: number;
}

export interface TopLateUserItem {
  userId: string;
  userName: string;
  className?: string;
  lateCount: number;
  avgLateMinutes: number;
}

export interface AdminMetricsData {
  overview: AdminOverview;
  dailyTrend: DailyTrendItem[];
  classComparison: ClassComparisonItem[];
  dayOfWeekPattern: DayOfWeekItem[];
  clockInDistribution: ClockInDistributionItem[];
  topLateStudents: TopLateUserItem[];
  topLateTeachers: TopLateUserItem[];
}

// ─── Teacher Metrics ────────────────────────────────────────────────────────
export interface TeacherOverview {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  studentAttendanceRate: number;
  myGateStatus: string | null;
  avgStudentsPerSession: number;
}

export interface SubjectBreakdownItem {
  subjectName: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  rate: number;
}

export interface SessionHistoryItem {
  week: string;
  total: number;
  valid: number;
  cancelled: number;
  pending: number;
}

export interface AtRiskStudentItem {
  studentId: string;
  studentName: string;
  className: string;
  attendanceRate: number;
}

export interface TeacherMetricsData {
  overview: TeacherOverview;
  studentTrend: DailyTrendItem[];
  subjectBreakdown: SubjectBreakdownItem[];
  statusDistribution: { present: number; late: number; absent: number; excused: number };
  sessionHistory: SessionHistoryItem[];
  atRiskStudents: AtRiskStudentItem[];
}

// ─── Curriculum Metrics ─────────────────────────────────────────────────────
export interface CurriculumOverview {
  totalSessions: number;
  executionRate: number;
  cancelledSessions: number;
  substitutionCount: number;
  avgTeachingUnits: number;
  pendingValidation: number;
}

export interface ExecutionTrendItem {
  week: string;
  valid: number;
  cancelled: number;
  pending: number;
}

export interface TeacherExecutionItem {
  teacherId: string;
  teacherName: string;
  totalSessions: number;
  validSessions: number;
  rate: number;
}

export interface SubstitutionTrendItem {
  month: string;
  count: number;
}

export interface PendingTeacherItem {
  teacherId: string;
  teacherName: string;
  pendingCount: number;
}

export interface LowAttendanceClassItem {
  classId: number;
  className: string;
  totalSessions: number;
  avgAttendance: number;
}

export interface CurriculumMetricsData {
  overview: CurriculumOverview;
  executionTrend: ExecutionTrendItem[];
  teacherExecution: TeacherExecutionItem[];
  substitutionTrend: SubstitutionTrendItem[];
  pendingTeachers: PendingTeacherItem[];
  lowAttendanceClasses: LowAttendanceClassItem[];
}

// ─── Piket Metrics ──────────────────────────────────────────────────────────
export interface PiketOverview {
  totalScansToday: number;
  presentToday: number;
  lateToday: number;
  notScannedYet: number;
  earlyLeaveToday: number;
  peakHour: string;
}

export interface TimeSlotItem {
  timeSlot: string;
  count: number;
}

export interface WeeklyLateItem {
  date: string;
  lateCount: number;
}

export interface LateByClassItem {
  classId: number;
  className: string;
  lateCount: number;
}

export interface LateStudentTodayItem {
  userId: string;
  userName: string;
  className: string;
  clockInTime: string;
  lateMinutes: number;
}

export interface PiketMetricsData {
  overview: PiketOverview;
  clockInDistribution: TimeSlotItem[];
  weeklyLateTrend: WeeklyLateItem[];
  lateByClass: LateByClassItem[];
  statusBreakdown: { present: number; late: number; notYet: number };
  lateStudentsToday: LateStudentTodayItem[];
}

// ─── Staff/Personal Metrics ─────────────────────────────────────────────────
export interface PersonalOverview {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  excusedDays: number;
  attendanceRate: number;
  avgClockIn: string;
}

export interface MonthlyHistoryItem {
  month: string;
  present: number;
  late: number;
  absent: number;
}

export interface WeeklyRateItem {
  week: string;
  rate: number;
}

export interface PersonalMetricsData {
  overview: PersonalOverview;
  monthlyHistory: MonthlyHistoryItem[];
  clockInPattern: ClockInDistributionItem[];
  weeklyTrend: WeeklyRateItem[];
}

// ─── Student Metrics ────────────────────────────────────────────────────────
export interface StudentOverview {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  subjectAttendanceRate: number;
  avgClockIn: string;
}

export interface GateTrendItem {
  date: string;
  status: string;
}

export interface VsClassAverageItem {
  metric: string;
  myValue: number;
  classAverage: number;
}

export interface StudentMetricsData {
  overview: StudentOverview;
  gateTrend: GateTrendItem[];
  subjectBreakdown: SubjectBreakdownItem[];
  clockInPattern: ClockInDistributionItem[];
  vsClassAverage: VsClassAverageItem[];
}

// ─── Advanced Benchmark ─────────────────────────────────────────────────────
export interface AdvancedBenchmarkData {
  benchmark: {
    targetRate: number;
    actualRate: number;
    variance: number;
    status: 'achieved' | 'underperforming';
  };
  attendance: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
  };
  lostTimeAnalysis: {
    totalLeaveDays: number;
    gatePasses: {
      total: number;
      personal: number;
      official: number;
      sick: number;
    };
    unexcusedAbsents: number;
  };
  externalFactors: {
    eventsAffectingAttendance: number;
    scheduleOverrides: {
      total: number;
      holidays: number;
    };
  };
}
