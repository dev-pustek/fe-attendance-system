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
import { PageIcon, FilterIcon, ChevronDownIcon, SearchIcon } from "../../components/atoms/Icons";
import { FunnelIcon } from "@heroicons/react/24/outline";
import DatePicker from "../../components/molecules/DatePicker";
import { CustomSelect } from "../../components/molecules/CustomSelect";
import { SearchableAsyncSelect } from "../../components/molecules/SearchableAsyncSelect";
import Label from "../../components/atoms/Label";

const AttendanceMetrics: React.FC = () => {
  const { user } = useAuthStore();
  
  // States for input fields
  const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth >= 640);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [academicYearId, setAcademicYearId] = useState<number | undefined>(undefined);
  const [classId, setClassId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [classSearch, setClassSearch] = useState("");

  // States for applied query params
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '',
    endDate: '',
    academicYearId: undefined as number | undefined,
    classId: undefined as number | undefined,
    search: ''
  });

  // Fetch reference data
  const { data: acaYearsData } = useAcademicYears({ limit: 100 });
  const { data: classesData } = useClasses({ limit: 1000, academicYearId });

  // Use hook (role auto-detected by backend)
  const { data: response, isLoading, isFetching, error } = useAttendanceMetrics({
    startDate: appliedFilters.startDate || undefined,
    endDate: appliedFilters.endDate || undefined,
    academicYearId: appliedFilters.academicYearId,
    classId: appliedFilters.classId,
    search: appliedFilters.search || undefined
  });

  const handleApplyFilter = () => {
    setAppliedFilters({
      startDate,
      endDate,
      academicYearId,
      classId,
      search: searchQuery
    });
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    setAcademicYearId(undefined);
    setClassId(undefined);
    setSearchQuery("");
    setClassSearch("");
    setAppliedFilters({
      startDate: '',
      endDate: '',
      academicYearId: undefined,
      classId: undefined,
      search: ''
    });
  };

  return (
    <>
      <PageMeta
        title="Metrik Kehadiran | Dashboard"
        description="Analitik dan Metrik Kehadiran"
      />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <PageIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Metrik Kehadiran</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Analitik performa kehadiran berbasis peran.</p>
            </div>
          </div>
        </div>

        {/* ── Advanced Filter Card ── */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden">
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <FilterIcon className="size-5 text-brand-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                            Search & Filter Metrik
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Gunakan kriteria di bawah untuk memfilter metrik berdasarkan tanggal, tahun ajaran, atau kelas.
                    </p>
                </div>
                <div className="shrink-0 ml-4">
                    <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
                </div>
            </button>
            
            <div 
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
            >
                <div className="overflow-hidden min-h-0">
                    <div className="px-5 pb-5">
                        <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                        
                        <div className="grid grid-cols-1 gap-5 items-end sm:grid-cols-2 lg:grid-cols-12">
                            <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cari Karyawan</Label>
                                <div className="relative">
                                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleApplyFilter();
                                        }}
                                        placeholder="Cari nama karyawan..."
                                        className="h-[42px] w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Mulai</Label>
                                <DatePicker value={startDate} onChange={setStartDate} placeholder="Pilih tanggal" />
                            </div>
                            <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Akhir</Label>
                                <DatePicker value={endDate} onChange={setEndDate} placeholder="Pilih tanggal" />
                            </div>

                            {(response?.role === 'admin' || response?.role === 'teacher') && (
                                <>
                                    <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
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
                                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-12">
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
                            
                            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-12 mt-2">
                                <button
                                    onClick={handleResetFilter}
                                    className="flex h-11 w-auto min-w-[100px] items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleApplyFilter}
                                    disabled={isFetching}
                                    className="flex h-11 w-auto min-w-[100px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-600 shadow-sm disabled:opacity-70"
                                >
                                    {isFetching ? (
                                        <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        <SearchIcon className="size-4" />
                                    )}
                                    Cari
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
