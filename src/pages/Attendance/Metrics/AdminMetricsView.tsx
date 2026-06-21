import React from 'react';
import { AdminMetricsData, MetricsQueryParams } from '../../../api/types/analytics';
import { useAdvancedAnalytics } from '../../../api/hooks/useAnalytics';
import { 
  TrophyIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CheckBadgeIcon,
  CalendarDaysIcon, PaperAirplaneIcon, BookmarkSquareIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import MetricCard from '../../../components/molecules/MetricCard';
import { UsersIcon, CheckCircleIcon, ClockIcon, XCircleIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import ComponentCard from '../../../components/molecules/ComponentCard';

interface AdminMetricsViewProps {
  data: AdminMetricsData;
  filters?: MetricsQueryParams;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-lg dark:border-white/[0.05] dark:bg-gray-900">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{formatDate(label)}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm font-bold flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name === 'present' ? 'Hadir' : entry.name === 'late' ? 'Terlambat' : 'Absen'}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminMetricsView: React.FC<AdminMetricsViewProps> = ({ data, filters }) => {
  const { overview, dailyTrend, classComparison, clockInDistribution, topLateStudents } = data;
  
  const { data: advancedData, isLoading: isAdvancedLoading } = useAdvancedAnalytics(filters);

  return (
    <div className="space-y-6">

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

      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        <MetricCard
          title="Total Pengguna"
          value={overview.totalUsers.toLocaleString()}
          icon={<UsersIcon />}
          color="brand"
        />
        <MetricCard
          title="Hadir Hari Ini"
          value={overview.presentToday.toLocaleString()}
          icon={<CheckCircleIcon />}
          color="green"
        />
        <MetricCard
          title="Terlambat Hari Ini"
          value={overview.lateToday.toLocaleString()}
          icon={<ClockIcon />}
          color="orange"
        />
        <MetricCard
          title="Tidak Hadir"
          value={overview.absentToday.toLocaleString()}
          icon={<XCircleIcon />}
          color="red"
        />
        <MetricCard
          title="Tingkat Kehadiran"
          value={`${overview?.attendanceRate?.toFixed(1) ?? '0.0'}%`}
          icon={<ChartBarIcon />}
          color="blue"
        />
        <MetricCard
          title="Rata-rata Terlambat"
          value={`${overview?.avgLateMinutes?.toFixed(0) ?? '0'} mnt`}
          icon={<ClockIcon />}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Trend Area Chart */}
        <ComponentCard title="Tren Kehadiran Harian">
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={formatDate} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="present" stroke="#10B981" fillOpacity={1} fill="url(#colorPresent)" stackId="1" />
                <Area type="monotone" dataKey="late" stroke="#F59E0B" fillOpacity={1} fill="url(#colorLate)" stackId="1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ComponentCard>

        {/* Weekly Pattern */}
        <ComponentCard title="Pola Kehadiran Mingguan">
          <div className="h-[300px] w-full pt-4 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dayOfWeekPattern} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis dataKey="day" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={80} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="present" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} barSize={20} name="Hadir" />
                <Bar dataKey="late" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} barSize={20} name="Terlambat" />
                <Bar dataKey="absent" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} name="Absen/Cuti" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ComponentCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Clock In Distribution */}
        <ComponentCard title="Distribusi Jam Masuk">
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clockInDistribution} margin={{ right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Jumlah Scan" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ComponentCard>

        {/* Top Late Users */}
        <ComponentCard title="Karyawan Sering Terlambat (Top 10)">
          {/* Mobile view: Cards */}
          <div className="block sm:hidden space-y-3 mt-2">
            {topLateStudents.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">Tidak ada data keterlambatan.</div>
            ) : (
              topLateStudents.map((student, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{student.userName}</span>
                    <span className="text-xs text-gray-500">{student.className}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400">
                      {student.lateCount} kali telat
                    </span>
                    <span className="text-xs text-red-500 font-medium">Avg: {student.avgLateMinutes.toFixed(0)} mnt</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop view: Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Nama Karyawan</th>
                  <th className="px-4 py-3">Posisi</th>
                  <th className="px-4 py-3 text-center">Jml Terlambat</th>
                  <th className="px-4 py-3 text-center">Rata-rata (Menit)</th>
                </tr>
              </thead>
              <tbody>
                {topLateStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                      Tidak ada data keterlambatan.
                    </td>
                  </tr>
                ) : (
                  topLateStudents.map((student, idx) => (
                    <tr key={idx} className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{student.userName}</td>
                      <td className="px-4 py-3">{student.className}</td>
                      <td className="px-4 py-3 text-center text-orange-500 font-bold">{student.lateCount}</td>
                      <td className="px-4 py-3 text-center text-red-500">{student.avgLateMinutes.toFixed(0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
};

export default AdminMetricsView;
