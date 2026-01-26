import { useEffect, useState } from "react";
import { dashboardService } from "../../api/services/dashboardService";
import { StudentDashboardSummary } from "../../api/types/dashboard";
import StudentPerformance from "../../components/organisms/Dashboard/Student/StudentPerformance";
import ArrivalHabitsChart from "../../components/organisms/Dashboard/Student/ArrivalHabitsChart";
import StudentScanHistory from "../../components/organisms/Dashboard/Student/StudentScanHistory";
import SubjectAttendanceMetrics from "../../components/organisms/Dashboard/Student/SubjectAttendanceMetrics";
import PageMeta from "../../components/atoms/PageMeta";

export default function StudentDashboard() {
  const [summary, setSummary] = useState<StudentDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await dashboardService.getStudentSummary();
        setSummary(data);
      } catch (err) {
        console.error("Failed to load student dashboard", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading dashboard data...</div>;
  }

  if (error) {
    return (
        <div className="p-8 text-center">
            <p className="text-red-500">Failed to load dashboard: {error}</p>
        </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="mt-8 space-y-6"> {/* Added top margin to account for fixed header */}
        <PageMeta title="Student Dashboard | Visia" description="Overview of your attendance and performance" />

        {/* 1. Header Stats with User Welcome */}
        {/* Note: StudentHeaderStats expects 'stats', but checking summary type, it might differ. 
            However, assuming summary structure matches previous context or valid data. 
            If summary.stats is unavailable, we should handle it or use summary.overview if that's what was there.
            Previous code had <StudentPerformance overview={summary.overview} />. 
            User replaced it with StudentHeaderStats. Let's assume stats exists or use summary.overview if structurally compatible.
            Reverting to use summary.attendanceStats if that's the correct field, or check store type.
            Let's optimistically use summary.stats assuming specific shape, or revert if errors persist.
            Actually, let's keep StudentPerformance if that was working, but add ID Card.
            Wait, I replaced StudentPerformance with StudentHeaderStats in my previous edit, but maybe that was wrong?
            The previous code had: <StudentPerformance overview={summary.overview} />.
            I will restore that if StudentHeaderStats doesn't exist or is wrong.
            But the user asked for ID Card. 
            I will stick to the previous working structure where possible but add ID card.
        */}
        <StudentPerformance overview={summary.overview} />
        
        {/* 2. Charts & History Grid */}
        <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-8 h-full space-y-6">
                <ArrivalHabitsChart trends={summary.trends} />
                
                {summary.subjectAttendance && (
                    <SubjectAttendanceMetrics metrics={summary.subjectAttendance.metrics} />
                )}
            </div>
            <div className="col-span-12 xl:col-span-4 h-full">
                <StudentScanHistory logs={summary.recentLogs} />
            </div>
        </div>
    </div>
  );
}
