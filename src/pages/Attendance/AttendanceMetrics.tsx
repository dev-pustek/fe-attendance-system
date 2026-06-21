import React, { useState } from "react";
import PageMeta from "../../components/atoms/PageMeta";
import { useAuthStore } from "../../store/authStore";
import { useAttendanceMetrics } from "../../api/hooks/useAnalytics";
import { useClasses, useAcademicYears } from "../../api/hooks/useAcademic";
import AdminMetricsView from "./Metrics/AdminMetricsView";
import TeacherMetricsView from "./Metrics/TeacherMetricsView";
import CurriculumMetricsView from "./Metrics/CurriculumMetricsView";
import PiketMetricsView from "./Metrics/PiketMetricsView";
import StaffMetricsView from "./Metrics/StaffMetricsView";
import StudentMetricsView from "./Metrics/StudentMetricsView";
import { PageIcon } from "../../components/atoms/Icons";
import { FunnelIcon } from "@heroicons/react/24/outline";
import DatePicker from "../../components/molecules/DatePicker";
import { CustomSelect } from "../../components/molecules/CustomSelect";
import { SearchableAsyncSelect } from "../../components/molecules/SearchableAsyncSelect";
import Label from "../../components/atoms/Label";

const AttendanceMetrics: React.FC = () => {
  const { user } = useAuthStore();
  
  // States for filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [academicYearId, setAcademicYearId] = useState<number | undefined>(undefined);
  const [classId, setClassId] = useState<number | undefined>(undefined);
  const [classSearch, setClassSearch] = useState("");

  // Fetch reference data
  const { data: acaYearsData } = useAcademicYears({ limit: 100 });
  const { data: classesData } = useClasses({ limit: 1000, academicYearId });

  // Use hook (role auto-detected by backend)
  const { data: response, isLoading, isFetching, error } = useAttendanceMetrics({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    academicYearId,
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
          
          <form onSubmit={handleFilterSubmit} className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 sm:flex-row sm:items-end">
            
            <div className="flex-1 space-y-1.5 min-w-[150px]">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Mulai</Label>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Pilih tanggal" />
            </div>

            <div className="flex-1 space-y-1.5 min-w-[150px]">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Akhir</Label>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="Pilih tanggal" />
            </div>
            
            {(response?.role === 'admin' || response?.role === 'teacher') && (
              <>
                <div className="flex-1 space-y-1.5 min-w-[150px]">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tahun Ajaran</Label>
                  <CustomSelect
                    value={academicYearId ? String(academicYearId) : ""}
                    onChange={(val) => setAcademicYearId(val ? Number(val) : undefined)}
                    onClear={() => setAcademicYearId(undefined)}
                    placeholder="Semua Tahun Ajaran"
                    options={acaYearsData?.data?.map((y) => ({ label: y.name, value: String(y.id) })) || []}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 space-y-1.5 min-w-[150px]">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kelas Spesifik</Label>
                  <SearchableAsyncSelect
                    value={classId ? String(classId) : ""}
                    onChange={(val) => setClassId(val ? Number(val) : undefined)}
                    onSearch={setClassSearch}
                    onClear={() => setClassId(undefined)}
                    placeholder="Cari kelas..."
                    options={
                      classesData?.data
                        ?.filter((c) => c.name.toLowerCase().includes(classSearch.toLowerCase()))
                        .map((c) => ({ label: c.name, value: String(c.id) })) || []
                    }
                    className="w-full"
                  />
                </div>
              </>
            )}
            
            <button type="submit" disabled={isFetching} className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 text-sm bg-brand-500 text-white rounded-xl hover:bg-brand-600 font-medium transition-colors shadow-sm sm:mb-[2px] w-full sm:w-auto h-[42px] disabled:opacity-70">
              {isFetching ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <FunnelIcon className="w-4 h-4" />
              )}
              {isFetching ? "Memuat..." : "Terapkan Filter"}
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
