
import { useTeacherCockpit } from "./TeacherCockpitContext";
import { useTeachingScheduleTemplates } from "../../../api/hooks/useAcademic";
import { CalenderIcon, FileIcon, TableIcon } from "../../../components/atoms/Icons"; // Replaced PrinterIcon
import Button from "../../../components/atoms/Button";
import { academicService } from "../../../api/services/academicService";
import { showError } from "../../../utils/toast";
import ScheduleMatrix from "../TeachingScheduleTemplates/ScheduleMatrix"; 
import { useNavigate } from "react-router"; 

const PersonalScheduleTab = () => {
    const { employeeDetails } = useTeacherCockpit();
    const navigate = useNavigate();
    
    // Fetch Schedule
    const { data: scheduleResponse, isLoading } = useTeachingScheduleTemplates({
        teacherId: employeeDetails?.userId,
        isActive: true,
        limit: 1000
    });
    
    const templates = scheduleResponse?.data || [];
    
    if (isLoading) {
        return <div className="p-8 animate-pulse text-gray-400">Loading schedule...</div>;
    }

    if (templates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                <div className="size-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                    <CalenderIcon className="size-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Schedule Found</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                    There are no classes scheduled for this teacher yet.
                </p>
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md">
                    Schedules are managed in the Class Cockpit or Master Schedule.
                </div>
                <div className="mt-6">
                    <Button 
                        onClick={() => navigate(`/academic/teaching-schedule-templates?teacherId=${employeeDetails?.userId}`)}
                        size="sm"
                        startIcon={<CalenderIcon className="size-4" />}
                    >
                        Set Schedule
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4 w-full max-w-full overflow-hidden">
            <div className="flex items-center justify-between shrink-0 px-1">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Weekly Schedule</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {templates.length} sessions scheduled per week
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            try {
                                const teacherId = employeeDetails?.userId;
                                if (!teacherId) return;
                                const blob = await academicService.printTeacherSchedule(teacherId);
                                const filename = `schedule-teacher-${teacherId}.pdf`;
                                
                                const url = window.URL.createObjectURL(blob as Blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', filename); 
                                document.body.appendChild(link);
                                link.click();
                                link.parentNode?.removeChild(link);
                            } catch (error) {
                                console.error("Failed to print schedule", error);
                                showError("Failed to generate schedule PDF");
                            }
                        }}
                        className="flex items-center gap-2 px-3 h-[36px] bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                        <FileIcon className="size-3.5" />
                        <span>PDF</span>
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const teacherId = employeeDetails?.userId;
                                if (!teacherId) return;
                                const blob = await academicService.exportExcelTeacherSchedule(teacherId);
                                const filename = `schedule-teacher-${teacherId}.xlsx`;
                                
                                const url = window.URL.createObjectURL(blob as Blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', filename); 
                                document.body.appendChild(link);
                                link.click();
                                link.parentNode?.removeChild(link);
                            } catch (error) {
                                console.error("Failed to export Excel", error);
                                showError("Failed to generate Excel file");
                            }
                        }}
                        className="flex items-center gap-2 px-3 h-[36px] bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                        <TableIcon className="size-3.5" />
                        <span>Excel</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 min-w-0 grid grid-cols-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                 <ScheduleMatrix 
                    templates={templates}
                    viewMode="teacher"
                    onAddSession={() => {}}
                    onEditSession={() => {}}
                    onDeleteSession={() => {}}
                    onMoveSession={() => {}}
                    onDropSubject={() => {}}
                    readOnly={true}
                 />
            </div>
        </div>
    );
};

export default PersonalScheduleTab;
