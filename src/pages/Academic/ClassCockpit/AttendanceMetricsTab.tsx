import {
  PieChartIcon,
  TimeIcon,
  CloseIcon,
  CheckLineIcon
} from "../../../components/atoms/Icons";
import ComponentCard from "../../../components/molecules/ComponentCard";
import Badge from "../../../components/atoms/Badge";

const AttendanceMetricsTab = () => {
    // Mock Data - Replace with real API data later
    const stats = {
        attendanceRate: 94.5,
        presentCount: 29,
        lateCount: 2,
        absentCount: 1,
        totalStudents: 32,
        trend: [92, 95, 88, 96, 94, 98, 94]
    };

    const atRiskStudents = [
        { id: 1, name: "Michael Johnson", rate: 75, status: "Critical" },
        { id: 2, name: "Sarah Connor", rate: 82, status: "Warning" },
        { id: 3, name: "John Doe", rate: 84, status: "Warning" },
    ];

    const recentActivity = [
        { id: 1, name: "Emily Davis", status: "late", time: "08:15 AM", date: "Today" },
        { id: 2, name: "Michael Johnson", status: "absent", time: "-", date: "Today" },
        { id: 3, name: "Jessica Brown", status: "excused", time: "-", date: "Yesterday" },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header with Period Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Attendance Analytics</h2>
                    <p className="text-sm text-gray-500">Overview of class attendance performance</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl self-start sm:self-auto">
                    <button className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-white/10 shadow-sm text-gray-900 dark:text-white transition-all">This Week</button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">This Month</button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Semester</button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attendance Rate */}
                <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <PieChartIcon className="size-16 text-brand-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Attendance Rate</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.attendanceRate}%</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded">+2.5%</span>
                        <span className="text-xs text-gray-400">vs last week</span>
                    </div>
                </div>

                {/* Present */}
                <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 flex flex-col justify-between h-32">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Present Avg</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.presentCount}</h3>
                        </div>
                        <div className="size-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600">
                            <CheckLineIcon className="size-5" />
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${(stats.presentCount / stats.totalStudents) * 100}%` }} />
                    </div>
                </div>

                {/* Late */}
                <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 flex flex-col justify-between h-32">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Late Avg</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.lateCount}</h3>
                        </div>
                        <div className="size-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                            <TimeIcon className="size-5" />
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(stats.lateCount / stats.totalStudents) * 100}%` }} />
                    </div>
                </div>

                 {/* Absent */}
                 <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 flex flex-col justify-between h-32">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Absent Avg</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.absentCount}</h3>
                        </div>
                        <div className="size-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600">
                            <CloseIcon className="size-5" />
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full" style={{ width: `${(stats.absentCount / stats.totalStudents) * 100}%` }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* At Risk Students */}
                <div className="lg:col-span-1">
                    <ComponentCard 
                        title="Needs Attention" 
                        desc="Students with low attendance rate"
                        className="h-full"
                    >
                        <div className="space-y-3 mt-2">
                            {atRiskStudents.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-50 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white border border-gray-100 dark:border-white/5">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{student.name}</p>
                                            <p className="text-xs text-red-500 font-medium">{student.rate}% Attendance</p>
                                        </div>
                                    </div>
                                    <Badge color={student.status === "Critical" ? "error" : "warning"}>
                                        {student.status}
                                    </Badge>
                                </div>
                            ))}
                            <button className="w-full py-2 text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors bg-brand-50 dark:bg-brand-500/10 rounded-lg">
                                View Full Report
                            </button>
                        </div>
                    </ComponentCard>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <ComponentCard 
                        title="Recent Activity" 
                        desc="Latest attendance updates from today's classes"
                        className="h-full"
                    >
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">Student</th>
                                        <th className="px-4 py-3 font-bold">Status</th>
                                        <th className="px-4 py-3 font-bold">Time</th>
                                        <th className="px-4 py-3 font-bold text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {recentActivity.map(activity => (
                                        <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01]">
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                {activity.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge color={
                                                    activity.status === "late" ? "warning" :
                                                    activity.status === "absent" ? "error" :
                                                    "info"
                                                }>
                                                    {activity.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                                {activity.time}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                                {activity.date}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </ComponentCard>
                </div>
            </div>
            
        </div>
    );
};

export default AttendanceMetricsTab;
