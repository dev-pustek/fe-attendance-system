import re

with open("src/pages/Attendance/Metrics/AdminMetricsView.tsx", "r") as f:
    content = f.read()

# Add imports
content = content.replace("import { AdminMetricsData } from '../../../api/types/analytics';", 
"""import { AdminMetricsData, MetricsQueryParams } from '../../../api/types/analytics';
import { useAdvancedAnalytics } from '../../../api/hooks/useAnalytics';
import { 
  TrophyIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CheckBadgeIcon,
  CalendarDaysIcon, PaperAirplaneIcon, BookmarkSquareIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';""")

# Update Props
content = content.replace("""interface AdminMetricsViewProps {
  data: AdminMetricsData;
}""", """interface AdminMetricsViewProps {
  data: AdminMetricsData;
  filters?: MetricsQueryParams;
}""")

# Update Component Signature
content = content.replace("""const AdminMetricsView: React.FC<AdminMetricsViewProps> = ({ data }) => {
  const { overview, dailyTrend, classComparison, clockInDistribution, topLateStudents } = data;""",
"""const AdminMetricsView: React.FC<AdminMetricsViewProps> = ({ data, filters }) => {
  const { overview, dailyTrend, classComparison, clockInDistribution, topLateStudents } = data;
  
  const { data: advancedData, isLoading: isAdvancedLoading } = useAdvancedAnalytics(filters);""")

# Add the Benchmarking Section at the top
benchmarking_ui = """
      {/* Benchmarking & Advanced Analytics Section */}
      {isAdvancedLoading ? (
        <div className="flex justify-center p-4"><div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div></div>
      ) : advancedData?.benchmark ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
          
          {/* Target KPI */}
          <div className={`col-span-1 rounded-2xl border p-5 ${advancedData.benchmark.status === 'achieved' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${advancedData.benchmark.status === 'achieved' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                Benchmark Kehadiran
              </h3>
              {advancedData.benchmark.status === 'achieved' ? <TrophyIcon className="w-6 h-6 text-emerald-500" /> : <ExclamationTriangleIcon className="w-6 h-6 text-rose-500" />}
            </div>
            <div className="flex items-end gap-3">
              <span className={`text-4xl font-black ${advancedData.benchmark.status === 'achieved' ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                {advancedData.benchmark.actualRate}%
              </span>
              <span className={`text-sm font-medium pb-1 ${advancedData.benchmark.status === 'achieved' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                / {advancedData.benchmark.targetRate}% Target
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {advancedData.benchmark.variance >= 0 ? (
                <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 text-rose-600" />
              )}
              <span className={`text-sm font-semibold ${advancedData.benchmark.status === 'achieved' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {advancedData.benchmark.variance > 0 ? '+' : ''}{advancedData.benchmark.variance}% dari target
              </span>
            </div>
          </div>

          {/* Lost Time Breakdown */}
          <div className="col-span-1 lg:col-span-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Analisis Komposisi Kehadiran</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <BookmarkSquareIcon className="w-5 h-5 text-purple-500 mb-2" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">{advancedData.lostTimeAnalysis.totalLeaveDays}</span>
                <span className="text-xs text-gray-500">Hari Cuti/Izin Aktif</span>
              </div>
              <div className="flex flex-col p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <PaperAirplaneIcon className="w-5 h-5 text-blue-500 mb-2" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">{advancedData.lostTimeAnalysis.gatePasses.total}</span>
                <span className="text-xs text-gray-500">Total Gate Pass</span>
              </div>
              <div className="flex flex-col p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <CalendarDaysIcon className="w-5 h-5 text-amber-500 mb-2" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">{advancedData.externalFactors.eventsAffectingAttendance}</span>
                <span className="text-xs text-gray-500">Event (Dispensasi)</span>
              </div>
              <div className="flex flex-col p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <CheckBadgeIcon className="w-5 h-5 text-brand-500 mb-2" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">{advancedData.externalFactors.scheduleOverrides.total}</span>
                <span className="text-xs text-gray-500">Override Jadwal</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Overview Cards */}
"""

content = content.replace("""      {/* Overview Cards */}""", benchmarking_ui)

with open("src/pages/Attendance/Metrics/AdminMetricsView.tsx", "w") as f:
    f.write(content)

