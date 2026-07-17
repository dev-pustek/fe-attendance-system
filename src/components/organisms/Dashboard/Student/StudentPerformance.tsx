import { StudentDashboardSummary } from "../../../../api/types/dashboard";
import { CheckCircleIcon, TimeIcon, ErrorIcon } from "../../../atoms/Icons";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface StudentPerformanceProps {
  overview: StudentDashboardSummary["overview"];
}

export default function StudentPerformance({ overview }: StudentPerformanceProps) {
  // Circular Progress Chart Options
  const chartOptions: ApexOptions = {
    chart: {
      type: "radialBar",
      fontFamily: "Outfit, sans-serif",
    },
    colors: overview.attendanceRate >= 90 ? ["#10B981"] : overview.attendanceRate >= 80 ? ["#F59E0B"] : ["#EF4444"],
    plotOptions: {
      radialBar: {
        hollow: {
          size: "65%",
        },
        track: {
          background: "#F3F4F6",
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: "14px",
            color: "#6B7280",
            offsetY: 20
          },
          value: {
            fontSize: "24px",
            fontWeight: 700,
            color: "#111827",
            offsetY: -10,
            formatter: (val) => `${val.toFixed(1)}%`
          },
        },
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Attendance"],
  };

  const chartSeries = [overview.attendanceRate];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
      {/* Attendance Score Card */}
      <div className="col-span-12 md:col-span-12 xl:col-span-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex items-center justify-between">
         <div className="flex-1">
             <h3 className="text-lg font-bold text-gray-800 dark:text-white">Attendance Score</h3>
             <p className="text-sm text-gray-500 mt-1">Your overall presence rate this semester.</p>
         </div>
         <div className="w-[120px] h-[120px] flex-shrink-0">
             <Chart options={chartOptions} series={chartSeries} type="radialBar" height={140} />
         </div>
      </div>

      {/* Breakdown Stats */}
      <div className="col-span-12 md:col-span-12 xl:col-span-8 grid grid-cols-3 gap-4">
        {/* Present */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-2">
                <CheckCircleIcon className="size-5" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{overview.present}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Present</span>
        </div>

         {/* Late */}
         <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-2">
                <TimeIcon className="size-5" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{overview.late}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Late</span>
        </div>

         {/* Absent */}
         <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
                <ErrorIcon className="size-5" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{overview.absent}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Absent</span>
        </div>
      </div>
    </div>
  );
}
