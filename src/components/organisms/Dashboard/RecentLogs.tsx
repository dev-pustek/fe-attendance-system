import { RecentLog } from "../../../api/types/dashboard";
import Badge from "../../atoms/Badge";
import { UserCircleIcon } from "../../atoms/Icons";

interface RecentLogsProps {
  logs: RecentLog[];
}

export default function RecentLogs({ logs }: RecentLogsProps) {
  return (
    <div className="col-span-12 xl:col-span-7 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Recent Activity
        </h3>
        <a href="/attendance/all" className="text-sm font-medium text-brand-500 hover:text-brand-600">
            View All
        </a>
      </div>

      <div className="space-y-4">
        {logs.map((log, index) => (
            <div key={index} className="flex items-center gap-4 py-2">
                <div className="relative shrink-0">
                    {log.photo ? (
                        <img 
                            src={log.photo} 
                            alt={log.userName} 
                            className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-white/5"
                        />
                    ) : (
                        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full dark:bg-white/5 text-gray-400">
                            <UserCircleIcon className="size-6" />
                        </div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate dark:text-white">
                        {log.userName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Scanned at {log.time}
                    </p>
                </div>

                <Badge color={log.status === 'present' ? 'success' : log.status === 'late' ? 'warning' : 'error'}>
                    {log.status}
                </Badge>
            </div>
        ))}

        {logs.length === 0 && (
             <div className="py-8 text-center text-sm text-gray-500">
                No recent activity recorded
            </div>
        )}
      </div>
    </div>
  );
}
