import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { StudentDashboardSummary } from "../../../../api/types/dashboard";
import { CheckCircleIcon, TimeIcon, ErrorIcon, DocsIcon } from "../../../atoms/Icons";

interface SubjectAttendanceMetricsProps {
    metrics: NonNullable<StudentDashboardSummary["subjectAttendance"]>["metrics"];
}

export default function SubjectAttendanceMetrics({ metrics }: SubjectAttendanceMetricsProps) {
    // Circular Progress Chart Options (reusing style from StudentPerformance)
    const chartOptions: ApexOptions = {
        chart: {
            type: "radialBar",
            fontFamily: "Outfit, sans-serif",
            sparkline: {
              enabled: true
            }
        },
        colors: metrics.attendanceRate >= 90 ? ["#3B82F6"] : metrics.attendanceRate >= 80 ? ["#F59E0B"] : ["#EF4444"],
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
                        show: false
                    },
                    value: {
                        fontSize: "22px",
                        fontWeight: 700,
                        color: "#111827",
                        offsetY: 8,
                        formatter: (val) => `${val}%`
                    },
                },
            },
        },
        stroke: {
            lineCap: "round",
        },
    };

    const chartSeries = [metrics.attendanceRate];

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Subject Attendance</h3>
                    <p className="text-sm text-gray-500 mt-1">Based on per-subject class presence.</p>
                </div>
                 <div className="w-[80px] h-[80px] flex-shrink-0">
                     <Chart options={chartOptions} series={chartSeries} type="radialBar" height={100} />
                 </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                 <div className="flex flex-col gap-1 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Classes</span>
                     <div className="flex items-center gap-2">
                        <DocsIcon className="size-4 text-gray-400" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{metrics.totalClasses}</span>
                     </div>
                </div>

                <div className="flex flex-col gap-1 p-3 rounded-xl bg-green-50 dark:bg-green-500/10">
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wider">Present</span>
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="size-4 text-green-500" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{metrics.present}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10">
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wider">Late</span>
                    <div className="flex items-center gap-2">
                        <TimeIcon className="size-4 text-orange-500" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{metrics.late}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1 p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wider">Absent</span>
                    <div className="flex items-center gap-2">
                        <ErrorIcon className="size-4 text-red-500" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{metrics.absent}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
