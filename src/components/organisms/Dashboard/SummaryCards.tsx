import {
  GroupIcon,
  CheckCircleIcon,
  TimeIcon,
  PieChartIcon,
  ArrowUpIcon
} from "../../atoms/Icons";
import Badge from "../../atoms/Badge";
import { DashboardOverview } from "../../../api/types/dashboard";

interface SummaryCardsProps {
  overview: DashboardOverview;
}

export default function SummaryCards({ overview }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
      
      {/* Total Population */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Population
            </span>
            <div className="flex items-end justify-between mt-1">
                <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                {overview.totalUsers.toLocaleString()}
                </h4>
            </div>
        </div>
      </div>

       {/* Present Today */}
       <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl dark:bg-green-500/10">
          <CheckCircleIcon className="text-green-500 size-6" />
        </div>
        <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Present Today
            </span>
            <div className="flex items-end justify-between mt-1">
                <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
                {overview.presentToday.toLocaleString()}
                </h4>
                <Badge color="success">
                    <ArrowUpIcon />
                    Live
                </Badge>
            </div>
        </div>
      </div>

       {/* Late Arrivals */}
       <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-orange-50 rounded-xl dark:bg-orange-500/10">
          <TimeIcon className="text-orange-500 size-6" />
        </div>
        <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Late Arrivals
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {overview.lateToday.toLocaleString()}
            </h4>
        </div>
      </div>

       {/* Attendance Rate */}
       <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl dark:bg-blue-500/10">
          <PieChartIcon className="text-blue-500 size-6" />
        </div>
        <div className="mt-5">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Attendance Rate
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {overview.attendanceRate}%
            </h4>
        </div>
      </div>

    </div>
  );
}
