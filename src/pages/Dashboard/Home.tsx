import PageMeta from "../../components/atoms/PageMeta";
import { useAuthStore } from "../../store/authStore";
import { useEffect, useState } from "react";
import { dashboardService } from "../../api/services/dashboardService";
import { DashboardSummary } from "../../api/types/dashboard";
import SummaryCards from "../../components/organisms/Dashboard/SummaryCards";
import WeeklyAttendanceChart from "../../components/organisms/Dashboard/WeeklyAttendanceChart";
import ClassLeaderboard from "../../components/organisms/Dashboard/ClassLeaderboard";
import RecentLogs from "../../components/organisms/Dashboard/RecentLogs";
import StudentDashboard from "./StudentDashboard";

export default function Home() {
  const { user } = useAuthStore();
  
  // Student - Redirect to Schedule as their Dashboard
  // Only if they are strictly a student (or based on preference)
  // Assuming Admin can see Dashboard, but Student cannot.
  // Assuming Admin can see Dashboard, but Student cannot.
  const roles = user?.roles?.map(r => r.name.toLowerCase()) || [];
  const userTypes = user?.userTypes?.map(t => t.toLowerCase()) || [];
  const typeAssignments = user?.typeAssignments?.map(t => t.userType?.name.toLowerCase()) || [];

  const allRoles = [...roles, ...userTypes, ...typeAssignments].filter((r): r is string => !!r);

  const isStudent = allRoles.some(r => r === 'student' || r.includes('student'));
  const isAdminOrStaff = allRoles.some(r => r.includes('admin') || r.includes('staff') || r.includes('teacher'));

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdminOrStaff) {
        const loadDashboard = async () => {
            try {
                const data = await dashboardService.getSummary();
                setDashboardData(data);
            } catch (error) {
                console.error("Failed to load dashboard summary", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadDashboard();
    } else {
        setIsLoading(false); // Not admin, stop loading
    }
  }, [isAdminOrStaff]);

  if (isStudent && !isAdminOrStaff) {
    return (
      <>
        <PageMeta
          title="Home | Visia"
          description="Student Dashboard - View your attendance stats and schedule."
        />
        <StudentDashboard />
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Dashboard | Visia"
        description="Visia - Intelligent Attendance Dashboard"
      />
      <div className="space-y-6"> 
        {/* Header */}
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Dashboard Overview</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Real-time insights on school attendance and activity.</p>
        </div>

        {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading dashboard data...</div>
        ) : dashboardData ? (
            <div className="grid grid-cols-12 gap-4 md:gap-6">
                {/* Row 1: Summary Cards */}
                <div className="col-span-12">
                    <SummaryCards overview={dashboardData.overview} />
                </div>

                {/* Row 2: Charts & Leaderboard */}
                <div className="col-span-12 xl:col-span-8">
                    <WeeklyAttendanceChart trends={dashboardData.trends} />
                </div>
                <div className="col-span-12 xl:col-span-4">
                    <ClassLeaderboard leaderboard={dashboardData.classLeaderboard} />
                </div>

                {/* Row 3: Recent Activity */}
                <div className="col-span-12">
                    <RecentLogs logs={dashboardData.recentLogs} />
                </div>
            </div>
        ) : (
            <div className="p-8 text-center text-red-500">Failed to load dashboard data.</div>
        )}
      </div>
    </>
  );
}
