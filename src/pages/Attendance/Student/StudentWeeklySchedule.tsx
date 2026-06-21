import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../../store/authStore';
import { useAcademicYears } from '../../../api/hooks/useAcademic';
import { useTeachingSessions } from '../../../api/hooks/useAttendance';
import { academicService } from '../../../api/services/academicService';
import { ruleService } from '../../../api/services/ruleService';
import { useQuery } from '@tanstack/react-query';
import PageMeta from '../../../components/atoms/PageMeta';
import PageBreadcrumb from '../../../components/molecules/PageBreadcrumb';
import { 
    TableCellsIcon,
    CalendarIcon,
    ExclamationCircleIcon,
    DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { FileIcon, TableIcon } from '../../../components/atoms/Icons'; 
import CustomSelect from '../../../components/molecules/CustomSelect';
import { showSuccess, showError, showLoading } from '../../../utils/toast';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import WeeklySessionMatrix from '../components/WeeklySessionMatrix';
import { saveAs } from 'file-saver';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import toast from 'react-hot-toast';
import { getJakartaDate } from "../../../utils/date";

// Define generic types for what ScheduleMatrix expects
type ScheduleMatrixRule = import('../../../api/types/rules').ScheduleRule;

const StudentWeeklySchedule = () => {
    const { user } = useAuthStore();
    const isTeacher = user?.roles?.some(r => ['guru', 'teacher'].includes(r.name.toLowerCase())) || user?.userTypes?.some(t => ['guru', 'teacher'].includes(t.toLowerCase()));
    const isStudent = user?.roles?.some(r => r.name.toLowerCase() === 'student') || user?.userTypes?.some(t => t.toLowerCase() === 'student') || (user?.profile as any)?.nis;
    
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // User's active class ID should be in their profile. 
    // Types might be tricky, checking flexible access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userClassId = user?.activeClass?.id || (user?.profile as any)?.activeClass?.id || (user as any)?.activeClass?.id || (user?.profile as any)?.class?.id || (user as any)?.class_id;
    
    // 1. Fetch Academic Years & state
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
    const { data: academicYearsResponse } = useAcademicYears({ limit: 100 });
    const academicYears = useMemo(() => academicYearsResponse?.data || [], [academicYearsResponse]);

    useEffect(() => {
        if (academicYears.length > 0 && !selectedAcademicYearId) {
            const activeYear = academicYears.find(y => y.isActive);
            if (activeYear) {
                setSelectedAcademicYearId(activeYear.id.toString());
            } else {
                setSelectedAcademicYearId(academicYears[0].id.toString());
            }
        }
    }, [academicYears, selectedAcademicYearId]);

    // 2. Fetch Sessions — filter to logged-in user's own schedule for the current week
    const now = getJakartaDate();
    const startOfCurrentWeek = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const endOfCurrentWeek = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const fetchParams: any = { 
        limit: 100,
        startDate: startOfCurrentWeek,
        endDate: endOfCurrentWeek
    };
    if (selectedAcademicYearId) fetchParams.academicYearId = selectedAcademicYearId;
    
    if (isStudent && userClassId) {
        // Students: show all schedules for their class
        fetchParams.classId = userClassId;
    } else {
        // Teachers: show only schedules where they are teaching
        fetchParams.actualTeacherId = user?.public_id || user?.id;
    }

    const { data: weeklyScheduleResponse, isLoading: isLoadingWeekly } = useTeachingSessions(fetchParams);
    const weeklySessions = useMemo(() => weeklyScheduleResponse?.data || [], [weeklyScheduleResponse]);

    // 2. Fetch Rules
    const { data: rulesResponse } = useQuery({
        queryKey: ['rules', 'effective', userClassId],
        queryFn: () => userClassId ? ruleService.getEffectiveScheduleRules({ classId: userClassId }) : null,
        enabled: !!userClassId,
    });
    
    // Transform array to record if needed, based on user feedback that it comes as array
    const effectiveRules = useMemo(() => {
        if (!rulesResponse?.data) return undefined;
        
        // If it's already an object (not array) and has keys, return it
        if (!Array.isArray(rulesResponse.data)) {
            return rulesResponse.data as Record<string, ScheduleMatrixRule>;
        }

        // Use 'any' to bypass TS check since generic might assume Record but runtime is Array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rulesArray = rulesResponse.data as any[];
        
        const rulesMap: Record<string, ScheduleMatrixRule> = {};
        rulesArray.forEach(rule => {
            if (rule.dayOfWeek) {
                rulesMap[rule.dayOfWeek] = rule;
                // Also map lowercase or title case if needed, but matrix checks uppercase usually.
                // Matrix checks: day.value (UPPERCASE), day.label (Title Case)
                // Let's ensure map covers uppercase as primary key
                rulesMap[rule.dayOfWeek.toUpperCase()] = rule;
            }
        });
        return rulesMap;
    }, [rulesResponse]);

    // 3. Fetch Policy (Minutes per Unit)
    const { data: policyData } = useQuery({
        queryKey: ['academic', 'teaching-unit-policies', 'active'],
        queryFn: async () => {
            try {
                return await academicService.getActiveTeachingUnitPolicy();
            } catch (error: any) {
                if (error?.response?.status === 404 || error?.status === 404 || error?.response?.data?.statusCode === 404) {
                    return null; // Graceful fallback if no active policy is set
                }
                throw error;
            }
        },
    });
    const minutesPerUnit = policyData?.data?.minutesPerUnit || 45;

    // Export Handlers
    const handleExport = async (type: 'pdf' | 'excel') => {
        if (!userClassId && !isTeacher) {
            showError("Tidak ada jadwal yang ditetapkan untuk diunduh.");
            return;
        }
        
        const toastId = showLoading(`Membuat ${type.toUpperCase()}...`);
        try {
            let blob;
            let filename;
            
            if (isTeacher) {
                if (type === 'pdf') {
                    blob = await academicService.printTeacherSchedule(user?.public_id || user?.id || "");
                    filename = `Teacher_Schedule_${user?.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
                } else {
                    blob = await academicService.exportExcelTeacherSchedule(user?.public_id || user?.id || "");
                    filename = `Teacher_Schedule_${user?.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
                }
            } else {
                if (type === 'pdf') {
                    blob = await academicService.printClassSchedule(userClassId);
                    filename = `My_Schedule_${user?.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
                } else {
                    blob = await academicService.exportExcelClassSchedule(userClassId);
                    filename = `My_Schedule_${user?.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
                }
            }
            
            if (blob) {
                saveAs(blob, filename);
                toast.dismiss(toastId);
                showSuccess("Unduhan dimulai!");
            }
        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            showError("Gagal mengunduh jadwal.");
        }
    };

    // 4. Fetch Class Subjects for Summary
    const { data: classSubjectsResponse } = useQuery({
        queryKey: ['academic', 'class-subjects', userClassId, selectedAcademicYearId],
        queryFn: () => userClassId ? academicService.getClassSubjects({
            classId: userClassId,
            academicYearId: selectedAcademicYearId || undefined,
            limit: 100,
            isActive: true
        }) : null,
        enabled: !!userClassId
    });
    const classSubjects = useMemo(() => classSubjectsResponse?.data || [], [classSubjectsResponse]);

    // Calculate Summary Stats
    let totalTarget = classSubjects.reduce((acc, s) => acc + (s.plannedUnitsPerWeek || 0), 0);
    const totalScheduled = weeklySessions.reduce((acc, s) => {
        if (s.isCancelled) return acc;
        if (s.teachingUnits) return acc + s.teachingUnits;
        if (s.startTime && s.endTime) {
            const start = new Date(`1970-01-01T${s.startTime}`);
            const end = new Date(`1970-01-01T${s.endTime}`);
            const durationMins = (end.getTime() - start.getTime()) / 60000;
            return acc + (durationMins / minutesPerUnit);
        }
        return acc;
    }, 0);
    
    if (totalTarget === 0 && totalScheduled > 0) {
        totalTarget = totalScheduled;
    }
    
    const percent = totalTarget > 0 ? (totalScheduled / totalTarget) * 100 : 0;

    const allAvailableDays = useMemo(() => [
        { label: "Senin", value: "MONDAY" },
        { label: "Selasa", value: "TUESDAY" },
        { label: "Rabu", value: "WEDNESDAY" },
        { label: "Kamis", value: "THURSDAY" },
        { label: "Jumat", value: "FRIDAY" },
        { label: "Sabtu", value: "SATURDAY" },
        { label: "Minggu", value: "SUNDAY" },
    ], []);

    const activeAvailableDays = useMemo(() => {
        if (!isMobile || !weeklySessions) return allAvailableDays;
        const activeDays = new Set(weeklySessions.map(s => {
            if (s.sessionDate) {
                return format(parseISO(s.sessionDate), 'EEEE').toUpperCase();
            }
            return "";
        }).filter(Boolean));
        
        return allAvailableDays.filter(day => activeDays.has(day.value));
    }, [isMobile, weeklySessions, allAvailableDays]);

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="hidden md:block">
                <PageMeta title="Jadwal Mingguan" description="Lihat jadwal kelas mingguan Anda." />
                <PageBreadcrumb pageTitle="Jadwal Mingguan" />
            </div>

            <div className="relative flex flex-col md:h-[calc(100vh-250px)] md:min-h-[600px] max-w-7xl -m-4 md:m-0 md:mx-auto md:pb-20 pb-24">
                 {/* Main Content Area */}
                <div className="flex-1 w-full relative min-w-0">
                     <div className="md:space-y-6 w-full h-full flex flex-col">
                        {/* Header Panel */}
                        <div className="bg-white dark:bg-white/[0.02] md:border border-gray-100 dark:border-white/5 md:rounded-2xl md:shadow-sm flex flex-col min-w-0 w-full max-w-full flex-1 min-h-[calc(100vh-80px)] md:min-h-0">
                             {/* Header Section */}
                            <div className="hidden md:block p-6 pb-6 relative border-b border-gray-100 dark:border-white/5">
                                 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                     <div>
                                         <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jadwal Kelas</h1>
                                         <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {user?.activeClass?.name || "Jadwal Kelas Anda"}
                                         </p>
                                     </div>
                                 </div>
                            </div>

                            {/* STICKY TABS */}
                            <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B0B0F]/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10 px-4 md:px-6 pt-2">
                                <div className="flex items-center gap-8 overflow-x-auto no-scrollbar relative">
                                     {academicYears.map(year => {
                                         const isActive = selectedAcademicYearId === year.id.toString();
                                         return (
                                             <button
                                                 key={year.id}
                                                 onClick={() => setSelectedAcademicYearId(year.id.toString())}
                                                 className={`relative whitespace-nowrap pb-3 text-sm font-bold transition-colors ${
                                                     isActive
                                                     ? "text-brand-600 dark:text-brand-400"
                                                     : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                 }`}
                                             >
                                                 {year.code || year.name}
                                                 {isActive && (
                                                     <motion.div
                                                         layoutId="activeTabUnderline"
                                                         className="absolute left-0 right-0 bottom-0 h-0.5 bg-brand-500 rounded-t-full"
                                                         transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                     />
                                                 )}
                                             </button>
                                         );
                                     })}
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 bg-white dark:bg-transparent min-w-0 overflow-hidden flex flex-col">
                                 <div className="md:p-6 p-0 flex-1 w-full flex flex-col overflow-hidden">
                                      
                                      {/* Matrix Container */}
                                      <div className="md:border border-gray-100 dark:border-white/5 md:rounded-xl overflow-hidden w-full max-w-full flex flex-col min-w-0 flex-1">
                                          
                                          {/* Summary Header */}
                                          <div className="px-4 md:px-6 py-4 bg-white md:bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                               <div className="flex items-center gap-4">
                                                   <div className="size-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                                                       {/* Using TableCellsIcon as generic icon for now */}
                                                       <TableCellsIcon className="size-5" />
                                                   </div>
                                                   <div>
                                                       <h3 className="font-bold text-gray-900 dark:text-white">Ringkasan Jadwal</h3>
                                                       <p className="text-xs text-gray-500">Total Progres untuk semua Mata Pelajaran</p>
                                                   </div>
                                               </div>
                                               
                                               <div className="flex items-center gap-4 w-full sm:w-auto min-w-0 sm:min-w-[300px]">
                                                    <div className="flex-1 w-full flex flex-col gap-1.5 min-w-[150px]">
                                                         <div className="flex justify-between items-center gap-3 text-xs font-medium">
                                                             <span className="text-gray-500">Total Terjadwal</span>
                                                             <span className={
                                                                 totalScheduled > totalTarget ? "text-error-600" : totalScheduled === totalTarget && totalTarget > 0 ? "text-success-600" : "text-brand-600"
                                                             }>
                                                                 {parseFloat(totalScheduled.toFixed(1))} / {totalTarget} Unit
                                                             </span>
                                                         </div>
                                                        <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    totalScheduled > totalTarget ? "bg-error-500" : totalScheduled === totalTarget && totalTarget > 0 ? "bg-success-500" : "bg-brand-500"
                                                                }`}
                                                                style={{ width: `${Math.min(100, percent)}%` }}
                                                            />
                                                        </div>
                                                   </div>
                                               </div>
                                          </div>

                                          {/* The Actual Matrix */}
                                          <div className="bg-gray-50 dark:bg-[#0B0B0F] flex-1 min-w-0 grid grid-cols-1">
                                              <div className="w-full">
                                                  {isLoadingWeekly ? (
                                                       <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                                           <div className="size-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 animate-pulse">
                                                               <CalendarIcon className="size-8" />
                                                           </div>
                                                           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Memuat Jadwal...</h3>
                                                           <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                                               Harap tunggu sebentar, kami sedang mengambil jadwal mingguan Anda dari server.
                                                           </p>
                                                       </div>
                                                  ) : (isStudent && !userClassId) ? (
                                                       <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                                           <div className="size-16 rounded-2xl bg-error-50 dark:bg-error-500/10 flex items-center justify-center text-error-600 dark:text-error-400 mb-4">
                                                               <ExclamationCircleIcon className="size-8" />
                                                           </div>
                                                           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Kelas Belum Diatur</h3>
                                                           <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                                               Anda belum dimasukkan ke kelas mana pun. Silakan hubungi administrator sekolah untuk pengaturan kelas Anda.
                                                           </p>
                                                       </div>
                                                  ) : (!weeklySessions || weeklySessions.length === 0) ? (
                                                       <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                                           <div className="size-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 ring-8 ring-gray-50/50 dark:ring-white/5">
                                                               <DocumentMagnifyingGlassIcon className="size-8" />
                                                           </div>
                                                           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tidak Ada Jadwal</h3>
                                                           <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                                               Belum ada jadwal kelas yang ditetapkan untuk Anda pada minggu ini. Silakan periksa kembali nanti atau pilih tahun ajaran lain.
                                                           </p>
                                                       </div>
                                                  ) : (
                                                    <WeeklySessionMatrix 
                                                        sessions={weeklySessions}
                                                        viewMode={isStudent ? "subject" : "teacher"}
                                                        availableDays={activeAvailableDays}
                                                        effectiveRules={isStudent ? effectiveRules : undefined}
                                                        minutesPerUnit={minutesPerUnit}
                                                    />
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                 </div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Floating Action Buttons */}
            {(!isStudent || userClassId) && (
                <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 flex flex-col gap-3 z-50">
                     <button
                        onClick={() => handleExport('pdf')}
                        className="flex items-center justify-center size-12 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 group"
                        title="Export PDF"
                     >
                        <FileIcon className="size-5" />
                        <span className="sr-only">PDF</span>
                     </button>
                     
                     <button
                        onClick={() => handleExport('excel')}
                        className="flex items-center justify-center size-12 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 group"
                        title="Export Excel"
                     >
                        <TableIcon className="size-5" />
                        <span className="sr-only">Excel</span>
                     </button>
                </div>
            )}
        </DndProvider>
    );
};

export default StudentWeeklySchedule;
