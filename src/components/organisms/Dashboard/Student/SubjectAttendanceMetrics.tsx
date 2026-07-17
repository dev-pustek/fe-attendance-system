import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { StudentDashboardSummary } from "../../../../api/types/dashboard";
import { DocumentTextIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface Props {
  metrics: NonNullable<StudentDashboardSummary["subjectAttendance"]>["metrics"];
}

export default function SubjectAttendanceMetrics({ metrics }: Props) {
  const data = [{ name: "Rate", value: metrics.attendanceRate, fill: metrics.attendanceRate >= 90 ? "#3B82F6" : metrics.attendanceRate >= 80 ? "#F59E0B" : "#EF4444" }];

  return (
    <div className="relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] p-8 shadow-sm border border-white/40 dark:border-white/5 h-full flex flex-col group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>

      <div className="flex items-start justify-between relative z-10 mb-6">
        <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Subject Attendance</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Overall subject presence</p>
        </div>
        <div className="w-24 h-24 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="70%" 
                    outerRadius="100%" 
                    barSize={10} 
                    data={data}
                    startAngle={90} 
                    endAngle={-270}
                >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#E5E7EB', opacity: 0.2 }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
            </ResponsiveContainer>
            <span className="absolute text-xl font-bold text-gray-900 dark:text-white">{metrics.attendanceRate.toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto relative z-10">
          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/50 dark:bg-white/5 border border-white/20 backdrop-blur-md">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total</span>
             <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalClasses}</span>
             </div>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Present</span>
            <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.present}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Late</span>
            <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-amber-500" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.late}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md">
            <span className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">Absent</span>
            <div className="flex items-center gap-2">
                <XCircleIcon className="w-5 h-5 text-rose-500" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.absent}</span>
            </div>
          </div>
      </div>
    </div>
  );
}
