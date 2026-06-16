import { useEffect, useState } from "react";
import PageMeta from "../../components/atoms/PageMeta";
import { StudentDashboardSummary } from "../../api/types/dashboard";
import { dashboardService } from "../../api/services/dashboardService";
import StudentSummaryCards from "../../components/organisms/Dashboard/Student/StudentSummaryCards";
import PersonalAttendanceTrendChart from "../../components/organisms/Dashboard/Student/PersonalAttendanceTrendChart";
import SubjectAttendanceMetrics from "../../components/organisms/Dashboard/Student/SubjectAttendanceMetrics";
import RecentLogs from "../../components/organisms/Dashboard/RecentLogs";
import MobileStudentDashboard from "../../components/organisms/Dashboard/Student/MobileStudentDashboard";

export default function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getStudentSummary()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
      <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
  );
  if (!data) return <div className="text-center text-red-500 p-8">Failed to load data</div>;

  return (
    <>
      {/* Mobile Redesign View */}
      <div className="block lg:hidden">
        <MobileStudentDashboard logs={data.recentLogs} />
      </div>

      {/* Desktop Existing View */}
      <div className="hidden lg:block min-h-screen bg-transparent animate-in fade-in duration-700 pb-10">
        <PageMeta title="Student Dashboard | SIAPUS" description="Personal attendance overview" />
        
        <div className="mb-8 relative z-10">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-2 tracking-tight">
            My Dashboard
          </h1>
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">
            Your personal attendance metrics and history.
          </p>
        </div>

        <div className="space-y-8 relative z-10">
          <StudentSummaryCards overview={data.overview} />

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 xl:col-span-6">
              <PersonalAttendanceTrendChart trends={data.trends} />
            </div>
            {data.subjectAttendance && (
              <div className="col-span-12 xl:col-span-6">
                <SubjectAttendanceMetrics metrics={data.subjectAttendance.metrics} />
              </div>
            )}
          </div>

          <div className="col-span-12">
              {/* Map the student logs to match RecentLogs expected format */}
              <RecentLogs logs={data.recentLogs.map((log, index) => ({
                  id: String(index),
                  userName: "You",
                  time: log.time,
                  status: log.status.toLowerCase(),
                  photo: null,
                  className: log.subject
              }))} />
          </div>
        </div>
      </div>
    </>
  );
}
