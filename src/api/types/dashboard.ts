export interface DashboardOverview {
  totalUsers: number;      // Total active students/staff
  presentToday: number;    // Count of users present today
  lateToday: number;       // Count of users late today
  attendanceRate: number;  // Percentage (e.g., 95.5)
}

export interface DashboardStats {
  present: number;
  late: number;
  absent: number;
}

export interface AttendanceTrend {
  date: string;  // "2024-01-20"
  day: string;   // "Mon"
  count: number; // Daily attendance count
}

export interface ClassLeaderboardItem {
  name: string;  // "XMIPA-1"
  count: number; // Present count
}

export interface RecentLog {
  userName: string;
  time: string;   // "07:15 AM"
  status: string; // "present" | "late"
  photo: string | null;
}

export interface DashboardSummary {
  overview: DashboardOverview;
  stats: DashboardStats;
  trends: AttendanceTrend[];
  classLeaderboard: ClassLeaderboardItem[];
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
    clockIn: string; // "07:15" or "-"
  }[];
  recentLogs: {
    date: string;
    time: string;
    status: string;
  }[];
}
