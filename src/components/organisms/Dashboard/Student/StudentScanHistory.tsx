import { StudentDashboardSummary } from "../../../../api/types/dashboard";
import Badge from "../../../atoms/Badge";
import { CheckCircleIcon, TimeIcon, ErrorIcon } from "../../../atoms/Icons";

interface StudentScanHistoryProps {
  logs: StudentDashboardSummary["recentLogs"];
}

export default function StudentScanHistory({ logs }: StudentScanHistoryProps) {
  
  const getStatusIcon = (status: string) => {
      switch(status.toLowerCase()) {
          case 'present': return <CheckCircleIcon className="size-5 text-green-500" />;
          case 'late': return <TimeIcon className="size-5 text-orange-500" />;
          default: return <ErrorIcon className="size-5 text-red-500" />;
      }
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
        case 'present': return 'success';
        case 'late': return 'warning';
        default: return 'error';
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        My Scan History
      </h3>

      <div className="space-y-4">
        {logs.map((log, index) => (
            <div key={index} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-white/5 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {getStatusIcon(log.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.date}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {log.time}
                    </p>
                </div>

                <Badge color={getStatusColor(log.status)}>
                    {log.status}
                </Badge>
            </div>
        ))}

        {logs.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">
                No recent scans found.
            </div>
        )}
      </div>
      
      <div className="mt-4 pt-2 border-t border-gray-100 dark:border-white/5 text-center">
          <a href="/student/attendance-history" className="text-sm font-medium text-brand-500 hover:text-brand-600">
              View Full History
          </a>
      </div>
    </div>
  );
}
