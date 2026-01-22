import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  TimeIcon,
  DocsIcon,
  PieChartIcon,
} from "../../atoms/Icons"; // Adjustable icons
import Badge from "../../atoms/Badge";
import { attendanceService } from "../../../api/services/attendanceService";
import { GateMetrics } from "../../../api/types/attendance";
import { useAuthStore } from "../../../store/authStore";

export default function StudentMetrics() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<GateMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch history to get metrics. 
        // We might want to filter by current Academic Year if possible, 
        // but for now let's just fetch default which usually implies "my history".
        const response = await attendanceService.getAttendanceHistory({
            limit: 1, // We only care about metrics
        });
        if (response && response.metrics) {
            setMetrics(response.metrics);
        }
      } catch (error) {
        console.error("Failed to fetch student metrics", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
        fetchMetrics();
    }
  }, [user]);

  if (loading) {
      return <div className="p-4 text-center text-gray-500">Loading metrics...</div>;
  }

  if (!metrics) {
      // Fallback or "No Data" state
      return null; 
  }

  // Helper for attendance color
  const getRateColor = (rate: number) => {
      if (rate >= 90) return "success";
      if (rate >= 75) return "warning";
      return "error";
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
      
      {/* 1. Attendance Rate */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <PieChartIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Attendance Rate
            </span>
            <div className="flex items-end justify-between mt-1">
                <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                {metrics.attendancePercentage}%
                </h4>
                <Badge color={getRateColor(metrics.attendancePercentage)}>
                    {metrics.attendancePercentage >= 90 ? "Excellent" : "Needs Attention"}
                </Badge>
            </div>
        </div>
      </div>

       {/* 2. Present Days */}
       <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl dark:bg-green-500/10">
          <CheckCircleIcon className="text-green-500 size-6" />
        </div>
        <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Present Days
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.presentCount}
            </h4>
        </div>
      </div>

       {/* 3. Late Arrivals */}
       <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-orange-50 rounded-xl dark:bg-orange-500/10">
          <TimeIcon className="text-orange-500 size-6" />
        </div>
        <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Late Arrivals
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.lateCount}
            </h4>
        </div>
      </div>

       {/* 4. Sick / Excused */}
       <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl dark:bg-blue-500/10">
          <DocsIcon className="text-blue-500 size-6" />
        </div>
        <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Sick & Permits
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {metrics.excusedCount}
            </h4>
        </div>
      </div>

    </div>
  );
}
