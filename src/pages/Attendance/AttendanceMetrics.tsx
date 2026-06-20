import React, { useState } from "react";
import PageMeta from "../../components/atoms/PageMeta";
import { useAuthStore } from "../../store/authStore";
import { useAttendanceMetrics } from "../../api/hooks/useAnalytics";
import AdminMetricsView from "./Metrics/AdminMetricsView";
import TeacherMetricsView from "./Metrics/TeacherMetricsView";
import CurriculumMetricsView from "./Metrics/CurriculumMetricsView";
import PiketMetricsView from "./Metrics/PiketMetricsView";
import StaffMetricsView from "./Metrics/StaffMetricsView";
import StudentMetricsView from "./Metrics/StudentMetricsView";
import { PageIcon } from "../../components/atoms/Icons";
import { FunnelIcon } from "@heroicons/react/24/outline";

const AttendanceMetrics: React.FC = () => {
  const { user } = useAuthStore();
  
  // States for filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [classId, setClassId] = useState<number | undefined>(undefined);

  // Use hook (role auto-detected by backend)
  const { data: response, isLoading, error } = useAttendanceMetrics({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    classId
  });

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The query hook will auto-refetch when state changes
  };

  return (
    <>
      <PageMeta
        title="Metrik Kehadiran | Dashboard"
        description="Analitik dan Metrik Kehadiran"
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Metrik Kehadiran</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Analitik performa kehadiran berbasis peran
            </p>
          </div>
          
          <form onSubmit={handleFilterSubmit} className="flex flex-col gap-3 p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 sm:flex-row sm:items-center sm:p-2 sm:rounded-xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                <FunnelIcon className="w-4 h-4"/>
              </span>
              <div className="flex flex-1 items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-sm font-medium border-0 bg-transparent py-1.5 focus:ring-0 dark:text-white"
                  placeholder="Mulai"
                />
                <span className="text-gray-300 dark:text-gray-600">-</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm font-medium border-0 bg-transparent py-1.5 focus:ring-0 dark:text-white"
                  placeholder="Selesai"
                />
              </div>
            </div>
            
            {response?.role === 'admin' && (
              <div className="flex items-center gap-2 px-2 sm:border-l sm:border-gray-200 dark:sm:border-gray-700">
                <input 
                  type="number"
                  placeholder="ID Kelas"
                  value={classId || ''}
                  onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full sm:w-24 text-sm font-medium border-0 bg-gray-50 dark:bg-gray-700/50 rounded-lg py-1.5 focus:ring-1 focus:ring-brand-500 dark:text-white"
                />
              </div>
            )}
            
            <button type="submit" className="px-3 py-1.5 text-sm bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 font-medium transition-colors dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20">
              Filter
            </button>
          </form>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex h-[400px] items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex h-[400px] flex-col items-center justify-center text-gray-500">
            <PageIcon className="mb-4 size-12 text-red-400 opacity-50" />
            <p className="text-red-500 font-medium">Gagal memuat metrik.</p>
            <p className="text-sm mt-2">{error.message}</p>
          </div>
        )}

        {/* Success State */}
        {response && !isLoading && !error && (
          <div className="animate-fade-in">
            {response.role === 'admin' && <AdminMetricsView data={response.data as any} filters={{ startDate: startDate || undefined, endDate: endDate || undefined, classId }} />}
            {response.role === 'teacher' && <TeacherMetricsView data={response.data as any} />}
            {response.role === 'curriculum' && <CurriculumMetricsView data={response.data as any} />}
            {response.role === 'piket' && <PiketMetricsView data={response.data as any} />}
            {response.role === 'staff' && <StaffMetricsView data={response.data as any} />}
            {response.role === 'student' && <StudentMetricsView data={response.data as any} />}
          </div>
        )}
      </div>
    </>
  );
};

export default AttendanceMetrics;
