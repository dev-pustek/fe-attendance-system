
import { useMemo } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { useTeachingScheduleTemplates } from '../../../api/hooks/useAcademic';
import { academicService } from '../../../api/services/academicService';
import { ruleService } from '../../../api/services/ruleService';
import { useQuery } from '@tanstack/react-query';
import PageMeta from '../../../components/atoms/PageMeta';
import PageBreadcrumb from '../../../components/molecules/PageBreadcrumb';
import { 
    TableCellsIcon 
} from '@heroicons/react/24/outline';
import { FileIcon, TableIcon } from '../../../components/atoms/Icons'; 
import { showSuccess, showError, showLoading } from '../../../utils/toast';
import { format } from 'date-fns';
import ScheduleMatrix from '../../Academic/TeachingScheduleTemplates/ScheduleMatrix';
import { saveAs } from 'file-saver';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import toast from 'react-hot-toast';

// Define generic types for what ScheduleMatrix expects
type ScheduleMatrixRule = import('../../../api/types/rules').ScheduleRule;

const StudentWeeklySchedule = () => {
    const { user } = useAuthStore();
    
    // User's active class ID should be in their profile. 
    // Types might be tricky, checking flexible access
    // User's active class ID should be in their profile. 
    // Types might be tricky, checking flexible access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userClassId = user?.activeClass?.id || (user?.profile as any)?.activeClass?.id || (user as any)?.activeClass?.id || (user?.profile as any)?.class?.id || (user as any)?.class_id;
    
    // 1. Fetch Templates
    const { data: weeklyScheduleResponse, isLoading: isLoadingWeekly } = useTeachingScheduleTemplates({
        classId: userClassId,
        limit: 100 // Ensure we get all sessions
    });
    const weeklyTemplates = useMemo(() => weeklyScheduleResponse?.data || [], [weeklyScheduleResponse]);

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
        queryFn: () => academicService.getActiveTeachingUnitPolicy(),
    });
    const minutesPerUnit = policyData?.data?.minutesPerUnit || 45;

    // Export Handlers
    const handleExport = async (type: 'pdf' | 'excel') => {
        if (!userClassId) {
            showError("No class assigned to download schedule for.");
            return;
        }
        
        const toastId = showLoading(`Generating ${type.toUpperCase()}...`);
        try {
            let blob;
            let filename;
            
            if (type === 'pdf') {
                blob = await academicService.printClassSchedule(userClassId);
                filename = `My_Schedule_${user?.name}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            } else {
                blob = await academicService.exportExcelClassSchedule(userClassId);
                filename = `My_Schedule_${user?.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            }
            
            if (blob) {
                saveAs(blob, filename);
                toast.dismiss(toastId);
                showSuccess("Download started!");
            }
        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            showError("Failed to download schedule.");
        }
    };

    // 4. Fetch Class Subjects for Summary
    const { data: classSubjectsResponse } = useQuery({
        queryKey: ['academic', 'class-subjects', userClassId],
        queryFn: () => userClassId ? academicService.getClassSubjects({
            classId: userClassId,
            limit: 100,
            isActive: true
        }) : null,
        enabled: !!userClassId
    });
    const classSubjects = useMemo(() => classSubjectsResponse?.data || [], [classSubjectsResponse]);

    // Calculate Summary Stats
    const totalTarget = classSubjects.reduce((acc, s) => acc + (s.plannedUnitsPerWeek || 0), 0);
    const totalScheduled = weeklyTemplates.reduce((acc, t) => {
        if (!t.isActive) return acc;
        if (t.plannedUnits) return acc + t.plannedUnits;
        if (t.startTime && t.endTime) {
            const start = new Date(`1970-01-01T${t.startTime}`);
            const end = new Date(`1970-01-01T${t.endTime}`);
            const durationMins = (end.getTime() - start.getTime()) / 60000;
            return acc + (durationMins / minutesPerUnit);
        }
        return acc;
    }, 0);
    const percent = totalTarget > 0 ? (totalScheduled / totalTarget) * 100 : 0;

    return (
        <DndProvider backend={HTML5Backend}>
            <PageMeta title="Weekly Schedule | Student" description="View your weekly class schedule." />
            <PageBreadcrumb pageTitle="Weekly Schedule" />

            <div className="relative flex flex-col h-[calc(100vh-220px)] min-h-[600px] max-w-7xl mx-auto pb-20 mt-6">
                 {/* Main Content Area */}
                <div className="flex-1 w-full relative min-w-0">
                     <div className="space-y-6 w-full h-full flex flex-col">
                        {/* Header Panel */}
                        <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col min-w-0 w-full max-w-full flex-1">
                             {/* Header Section */}
                            <div className="p-6 pb-6 relative border-b border-gray-100 dark:border-white/5">
                                 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                     <div>
                                         <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Schedule</h1>
                                         <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {user?.activeClass?.name || "Your Class Schedule"}
                                         </p>
                                     </div>

                                     {/* Action Buttons */}
                                     {userClassId && (
                                        <div className="flex items-center gap-2">
                                             <button
                                                onClick={() => handleExport('pdf')}
                                                className="flex items-center gap-2 px-4 h-[42px] bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                             >
                                                <FileIcon className="size-3.5" />
                                                <span>PDF</span>
                                             </button>
                                             
                                             <button
                                                onClick={() => handleExport('excel')}
                                                className="flex items-center gap-2 px-4 h-[42px] bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                             >
                                                <TableIcon className="size-3.5" />
                                                <span>Excel</span>
                                             </button>
                                        </div>
                                    )}
                                 </div>
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 bg-white dark:bg-transparent min-w-0 overflow-hidden flex flex-col">
                                 <div className="p-6 flex-1 w-full flex flex-col overflow-hidden">
                                      
                                      {/* Matrix Container */}
                                      <div className="border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden w-full max-w-full flex flex-col min-w-0 flex-1">
                                          
                                          {/* Summary Header */}
                                          <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                                               <div className="flex items-center gap-4">
                                                   <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                                       {/* Using TableCellsIcon as generic icon for now */}
                                                       <TableCellsIcon className="size-5" />
                                                   </div>
                                                   <div>
                                                       <h3 className="font-bold text-gray-900 dark:text-white">Schedule Summary</h3>
                                                       <p className="text-xs text-gray-500">Total Progress for all Subjects</p>
                                                   </div>
                                               </div>
                                               
                                               <div className="flex items-center gap-4 w-full sm:w-auto min-w-0 sm:min-w-[200px]">
                                                   <div className="flex-1 flex flex-col gap-1.5">
                                                        <div className="flex justify-between text-xs font-medium">
                                                            <span className="text-gray-500">Total Scheduled</span>
                                                            <span className={
                                                                totalScheduled > totalTarget ? "text-red-600" : totalScheduled === totalTarget ? "text-green-600" : "text-brand-600"
                                                            }>
                                                                {parseFloat(totalScheduled.toFixed(1))} / {totalTarget} Units
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    totalScheduled > totalTarget ? "bg-red-500" : totalScheduled === totalTarget ? "bg-green-500" : "bg-brand-500"
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
                                                       <div className="text-center py-12">Loading weekly schedule...</div>
                                                  ) : !userClassId ? (
                                                       <div className="text-center py-12 text-red-500">You are not assigned to any class. Please contact administrator.</div>
                                                  ) : (
                                                    <ScheduleMatrix 
                                                        templates={weeklyTemplates}
                                                        viewMode="subject"
                                                        onAddSession={() => {}}
                                                        onEditSession={() => {}}
                                                        onDeleteSession={() => {}}
                                                        onMoveSession={() => {}}
                                                        onDropSubject={() => {}}
                                                        effectiveRules={effectiveRules}
                                                        minutesPerUnit={minutesPerUnit}
                                                        readOnly={true}
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
        </DndProvider>
    );
};

export default StudentWeeklySchedule;
