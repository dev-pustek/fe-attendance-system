import { useEffect, useState } from "react";
import { dashboardService } from "../../api/services/dashboardService";
import { StudentDashboardSummary } from "../../api/types/dashboard";
import StudentPerformance from "../../components/organisms/Dashboard/Student/StudentPerformance";
import ArrivalHabitsChart from "../../components/organisms/Dashboard/Student/ArrivalHabitsChart";
import StudentScanHistory from "../../components/organisms/Dashboard/Student/StudentScanHistory";
import { useAuthStore } from "../../store/authStore";

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await dashboardService.getStudentSummary();
        setSummary(data);
      } catch (error) {
        console.error("Failed to load student dashboard", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading your performance data...</div>;
  }

  if (!summary) {
    return <div className="p-8 text-center text-red-500">Unable to load dashboard data.</div>;
  }

  return (
    <div className="space-y-6">
       {/* Welcome Header */}
       <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Here is your personal attendance summary & performance.
            </p>
        </div>

        {/* 1. Performance Overview */}
        <StudentPerformance overview={summary.overview} />

        {/* 2. Charts & History Grid */}
        <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-8 h-full">
                <ArrivalHabitsChart trends={summary.trends} />
            </div>
            <div className="col-span-12 xl:col-span-4 h-full">
                <StudentScanHistory logs={summary.recentLogs} />
            </div>
        </div>
    </div>
  );
}
