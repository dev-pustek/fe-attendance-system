export interface DashboardOverview {
  totalUsers: number;
  presentToday: number;
  lateToday: number;
  attendanceRate: number;
}

export interface DashboardStats {
  present: number;
  late: number;
  absent: number;
}

export interface AttendanceTrend {
  date: string;
  day: string;
  count: number;
}

export interface TopUserItem {
  name: string;
  count: number;
}

export interface RecentLog {
  userName: string;
  time: string;
  status: string;
  photo: string | null;
}

export interface DashboardSummary {
  overview: DashboardOverview;
  stats: DashboardStats;
  trends: AttendanceTrend[];
  topUsers: TopUserItem[];
  recentLogs: RecentLog[];
}

export interface StudentDashboardSummary {
  overview: {
    present: number;
    late: number;
    absent: number;
    attendanceRate: number;
  };
  trends: {
    date: string;
    day: string;
    status: string;
    clockIn: string;
  }[];
  recentLogs: {
    date: string;
    time: string;
    status: string;
    subject?: string;
  }[];
  subjectAttendance?: {
    metrics: {
        totalClasses: number;
        present: number;
        late: number;
        absent: number;
        excused: number;
        attendanceRate: number;
    };
    recentLogs: any[];
  };
}
export interface StudentRoadmapItem {
  id: string;
  type: 'scan_in' | 'scan_out' | 'class' | 'break';
  title: string;
  time: string;
  location: string;
  status: 'completed' | 'active' | 'upcoming' | 'missed' | 'holiday';
  duration?: string;
  sessionId?: string | number;
  teacherName?: string;
  classCode?: string;
  attendanceTime?: string;
  isOngoing?: boolean;
  overrideReason?: string | null;
}
