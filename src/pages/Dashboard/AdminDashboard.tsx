import { useState } from "react";
import PageMeta from "../../components/atoms/PageMeta";
import { useDashboardSummary } from "../../api/hooks/useDashboard";
import AdminSummaryCards from "../../components/organisms/Dashboard/Admin/AdminSummaryCards";
import AttendanceOverviewChart from "../../components/organisms/Dashboard/Admin/AttendanceOverviewChart";
import StatusDistributionChart from "../../components/organisms/Dashboard/Admin/StatusDistributionChart";
import TopUsersChart from "../../components/organisms/Dashboard/Admin/TopUsersChart";
import MobileStudentDashboard from "../../components/organisms/Dashboard/Student/MobileStudentDashboard";
import DatePicker from "../../components/molecules/DatePicker";

export default function AdminDashboard() {
  const currentYear = new Date().getFullYear();
  const defaultStart = `${currentYear}-01-01`;
  const defaultEnd = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format local time

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  const { data, isLoading: loading } = useDashboardSummary({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const isToday = startDate === defaultEnd && endDate === defaultEnd;
  const dateLabel = isToday ? "Hari Ini" : "Periode Ini";

  if (loading) return (
      <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
  );
  if (!data) return <div className="text-center text-red-500 p-8">Gagal memuat data</div>;

  return (
    <>
      {/* Mobile Redesign View */}
      <div className="block lg:hidden">
        <MobileStudentDashboard logs={data.recentLogs} />
      </div>

      {/* Desktop Existing View */}
      <div className="hidden lg:block min-h-screen bg-transparent animate-in fade-in duration-700 pb-10">
        <PageMeta title="Dasbor Admin | SIAPUS" description="Ringkasan kehadiran di seluruh sistem" />
        
        <div className="mb-8 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-2 tracking-tight">
              Ringkasan Sistem
            </h1>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">
              Wawasan waktu nyata untuk seluruh kelas dan pengguna.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Tanggal Mulai"
              className="w-40"
            />
            <span className="text-gray-400">-</span>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="Tanggal Akhir"
              className="w-40"
            />
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          <AdminSummaryCards overview={data.overview} dateLabel={dateLabel} />

          <div className="grid grid-cols-12 gap-8 items-stretch">
            <div className="col-span-12 lg:col-span-7">
              <TopUsersChart users={data.topUsers || (data as any).classLeaderboard || []} />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <StatusDistributionChart stats={data.stats} dateLabel={dateLabel} />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 items-stretch">
            <div className="col-span-12">
              <AttendanceOverviewChart trends={data.trends} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
