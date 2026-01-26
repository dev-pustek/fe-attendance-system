import { useMemo, useState } from "react";
import { useClassSchedules, useClasses, useAcademicYears } from "../../../api/hooks/useAcademic";
import { ClassSchedule, CreateClassScheduleDto } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { 
  PencilIcon, TrashBinIcon, PlusIcon, ChevronLeftIcon, AngleRightIcon, 
  CalenderIcon, TimeIcon, ListIcon, TableIcon, ChevronUpIcon, ChevronDownIcon, UserIcon 
} from "../../../components/atoms/Icons";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import CalendarWidget from "../../../components/molecules/Calendar/CalendarWidget";
import { EventInput } from "@fullcalendar/core";
import { useStudents } from "../../../api/hooks/useProfiles";
import NumberInput from "../../../components/molecules/NumberInput";

interface StudentListModalProps {
  classId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const StudentListModal: React.FC<StudentListModalProps> = ({ classId, isOpen, onClose }) => {
  const { data: response, isLoading } = useStudents({ 
    // @ts-expect-error - classId param type
    classId: classId || undefined, 
    limit: 100,
    isActive: true 
  });
  
  const students = response?.data || [];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Enrolled Students" 
      description="List of students currently enrolled in this class."
      className="max-w-xl"
      footer={
           <div className="flex justify-end pt-2">
             <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              >
                Close
              </button>
           </div>
      }
    >
      <div className="h-[60vh] overflow-y-auto pr-1">
        {isLoading ? (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                  <span className="text-sm text-gray-400">Loading students...</span>
                </div>
            </div>
        ) : students.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-500">
                <div className="size-12 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-3">
                  <UserIcon className="size-6 opacity-20" />
                </div>
                <p className="font-medium">No students enrolled</p>
                <p className="text-sm opacity-60">There are no students assigned to this class yet.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {students.map(student => (
                    <div key={student.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-brand-100 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/20">
                        <div className="flex size-10 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                            {student.user?.photo ? (
                                <img src={student.user.photo} alt={student.user.name} className="size-10 rounded-full object-cover" />
                            ) : (
                                <span className="text-sm font-bold">{student.user?.name?.charAt(0) || "S"}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {student.user?.name || student.studentId || "Unknown Student"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="font-mono">{student.nis || "-"}</span>
                                <span>•</span>
                                <span className="font-mono">{student.nisn || "-"}</span>
                            </div>
                        </div>
                        <div className="flex-none">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                student.studentStatus === 'Active' 
                                    ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                                {student.studentStatus}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </Modal>
  );
};

const DAYS_OF_WEEK = [
  { label: "Monday", value: "Monday" },
  { label: "Tuesday", value: "Tuesday" },
  { label: "Wednesday", value: "Wednesday" },
  { label: "Thursday", value: "Thursday" },
  { label: "Friday", value: "Friday" },
  { label: "Saturday", value: "Saturday" },
  { label: "Sunday", value: "Sunday" },
];

const ClassSchedules: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClassSchedule | string; direction: "asc" | "desc" } | null>(null);
  
  // Filters
  const [filterClassId, setFilterClassId] = useState<string>("");
  const [filterAcademicYearId, setFilterAcademicYearId] = useState<string>("");
  const [filterDay, setFilterDay] = useState<string>("");

  const { confirm, confirmState } = useConfirm();

  // Queries
  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useClassSchedules({
    page,
    limit,
    classId: filterClassId || undefined,
    academicYearId: filterAcademicYearId || undefined,
    dayOfWeek: filterDay || undefined,
  });

  const { data: classesResponse } = useClasses({ limit: 100, isActive: true });
  const { data: academicYearsResponse } = useAcademicYears({ limit: 100, isActive: true });

  const schedules = useMemo(() => response?.data || [], [response]);
  const meta = response?.meta;
  const classes = classesResponse?.data || [];
  const academicYears = academicYearsResponse?.data || [];

  // Sorting
  const handleSort = (key: keyof ClassSchedule | string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedSchedules = useMemo(() => {
    if (!sortConfig) return schedules;
    return [...schedules].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number | undefined = "";
      let valB: string | number | undefined = "";

      if (key === "class.name") {
          valA = a.class?.name || "";
          valB = b.class?.name || "";
      } else if (key === "academicYear.name") {
          valA = a.academicYear?.name || "";
          valB = b.academicYear?.name || "";
      } else {
          // @ts-expect-error - dynamic key access
          valA = a[key] ?? "";
          // @ts-expect-error - dynamic key access
          valB = b[key] ?? "";
      }

      if ((valA ?? 0) < (valB ?? 0)) return direction === "asc" ? -1 : 1;
      if ((valA ?? 0) > (valB ?? 0)) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [schedules, sortConfig]);

  const SortIcon = ({ column }: { column: keyof ClassSchedule | string }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  // Calendar Events Mapping
  const calendarEvents = useMemo(() => {
    return schedules.map((schedule): EventInput => {
        // Map dayOfWeek string (Monday) to recurring events
        // FullCalendar daysOfWeek: 0=Sun, 1=Mon...
        const dayMap: Record<string, number> = {
            "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, 
            "Thursday": 4, "Friday": 5, "Saturday": 6
        };
        
        return {
            id: String(schedule.id),
            title: `${schedule.class?.name || 'Class'} (${schedule.startTime} - ${schedule.endTime})`,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            daysOfWeek: [dayMap[schedule.dayOfWeek] ?? 1],
            extendedProps: {
                schedule
            }
        };
    });
  }, [schedules]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  
  const [formData, setFormData] = useState<CreateClassScheduleDto>({
    classId: "",
    academicYearId: "",
    dayOfWeek: "Monday",
    startTime: "07:00",
    endTime: "14:00",
    lateToleranceMinutes: 15,
    earlyLeaveThresholdMinutes: 15,
  });
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

  const handleOpenModal = (schedule?: ClassSchedule) => {
    if (schedule) {
      setSelectedSchedule(schedule);
      setFormData({
        classId: String(schedule.classId),
        academicYearId: String(schedule.academicYearId),
        dayOfWeek: schedule.dayOfWeek, // Ensure case matches opt values
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        lateToleranceMinutes: schedule.lateToleranceMinutes,
        earlyLeaveThresholdMinutes: schedule.earlyLeaveThresholdMinutes,
      });
    } else {
      setSelectedSchedule(null);
      setFormData({
        classId: "",
        academicYearId: "",
        dayOfWeek: "Monday",
        startTime: "07:00",
        endTime: "14:00",
        lateToleranceMinutes: 15,
        earlyLeaveThresholdMinutes: 15,
      });
    }
    setIsModalOpen(true);
  };

  const [studentListClassId, setStudentListClassId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = !!selectedSchedule;

    if (!formData.classId || !formData.academicYearId) {
        showError(null, "Please select both a Class and an Academic Year");
        return;
    }

    const confirmed = await confirm({
      variant: isUpdate ? 'update' : 'create',
      title: isUpdate ? 'Update Schedule' : 'Create Schedule',
      message: `Are you sure you want to ${isUpdate ? 'update' : 'create'} this class schedule?`,
    });

    if (!confirmed) return;

    try {
      const payload = {
          ...formData,
          classId: Number(formData.classId),
          academicYearId: Number(formData.academicYearId)
      };

      if (selectedSchedule) {
        await updateMutation.mutateAsync({
          id: selectedSchedule.id,
          data: payload
        });
        showSuccess("Class schedule updated successfully!");
      } else {
        await createMutation.mutateAsync(payload);
        showSuccess("Class schedule created successfully!");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, `Failed to ${isUpdate ? 'update' : 'create'} class schedule`);
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Schedule',
      message: 'Are you sure you want to delete this class schedule?',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Class schedule deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete class schedule");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedSchedules.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number | string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Bulk Delete Schedules',
      message: `Are you sure you want to permanently delete ${count} selected class schedules? This action cannot be undone.`,
      confirmText: `Delete ${count} Schedules`
    });

    if (confirmed) {
      try {
        const promises = selectedIds.map(id => deleteMutation.mutateAsync(id));
        await Promise.all(promises);
        showSuccess(`Successfully deleted ${count} schedules.`);
        setSelectedIds([]);
      } catch (error) {
        showError(error, "Failed to delete some schedules");
      }
    }
  };

  return (
    <>
      <PageMeta title="Class Schedules | Academic" description="Manage weekly class schedules." />
      <PageBreadcrumb pageTitle="Class Schedules" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Schedules</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage class timetables per academic year.</p>
          </div>
          <div className="flex items-center gap-3">
             {/* View Toggle */}
             <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center justify-center rounded-lg px-3 py-1.5 transition-all ${
                    viewMode === "list"
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <ListIcon className="size-4 mr-1.5" />
                  <span className="text-xs font-semibold">List</span>
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`flex items-center justify-center rounded-lg px-3 py-1.5 transition-all ${
                    viewMode === "calendar"
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <TableIcon className="size-4 mr-1.5" />
                  <span className="text-xs font-semibold">Calendar</span>
                </button>
             </div>

             <button
                onClick={() => handleOpenModal()}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
              >
                <PlusIcon className="fill-white text-xl text-white" />
                Add Schedule
              </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CustomSelect
            label="Filter Class"
            value={filterClassId}
            onChange={(val) => { setFilterClassId(String(val)); setPage(1); }}
            options={[
              { label: "All Classes", value: "" },
              ...classes.map(c => ({ label: c.name, value: String(c.id) }))
            ]}
            placeholder="Select Class"
          />
          <CustomSelect
            label="Filter Academic Year"
            value={filterAcademicYearId}
            onChange={(val) => { setFilterAcademicYearId(String(val)); setPage(1); }}
            options={[
              { label: "All Academic Years", value: "" },
              ...academicYears.map(y => ({ label: y.name, value: String(y.id) }))
            ]}
            placeholder="Select Academic Year"
          />
          <CustomSelect
            label="Filter Day"
            value={filterDay}
            onChange={(val) => { setFilterDay(String(val)); setPage(1); }}
            options={[
              { label: "All Days", value: "" },
              ...DAYS_OF_WEEK
            ]}
            placeholder="Select Day"
          />
        </div>

        {/* Bulk Selection Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm font-mono">
                {selectedIds.length}
              </div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Schedules Selected</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-error-50 dark:bg-error-500/10 border border-error-100 dark:border-error-500/20 rounded-xl text-sm font-bold text-error-600 dark:text-error-400 hover:bg-error-100 transition-all shadow-sm"
                >
                    <TrashBinIcon className="size-4" />
                    Delete Selected
                </button>
                <button
                    onClick={() => setSelectedIds([])}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
          </div>
        )}

        {/* Table */}
        {viewMode === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 w-12">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={sortedSchedules.length > 0 && selectedIds.length === sortedSchedules.length}
                        onChange={handleSelectAll}
                    />
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("class.name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Class <SortIcon column="class.name" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("academicYear.name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                     Academic Year <SortIcon column="academicYear.name" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                   <button onClick={() => handleSort("dayOfWeek")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                     Day & Time <SortIcon column="dayOfWeek" />
                   </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tolerance</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">Loading schedules...</TableCell>
                </TableRow>
              ) : sortedSchedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">No schedules found.</TableCell>
                </TableRow>
              ) : (
                sortedSchedules.map((schedule) => (
                  <TableRow key={schedule.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={selectedIds.includes(schedule.id)}
                            onChange={() => handleSelectRow(schedule.id)}
                        />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{schedule.class?.name || schedule.classId}</div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="text-gray-600 dark:text-gray-400 text-sm">{schedule.academicYear?.name || schedule.academicYearId}</div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                          <CalenderIcon className="size-4 text-brand-500" />
                          {schedule.dayOfWeek}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <TimeIcon className="size-3.5" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Late: <span className="font-medium text-brand-500">{schedule.lateToleranceMinutes}m</span></p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Early: <span className="font-medium text-warning-500">{schedule.earlyLeaveThresholdMinutes}m</span></p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setStudentListClassId(String(schedule.classId))}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                          title="View Students"
                        >
                          <UserIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(schedule)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                        >
                          <TrashBinIcon className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.03] p-1 rounded-2xl border border-gray-200 dark:border-white/[0.08]">
             <CalendarWidget
                events={calendarEvents}
                onDateSelect={() => {}} 
                onEventClick={(info) => {
                   const schedule = info.event.extendedProps.schedule as ClassSchedule;
                   if (schedule) handleOpenModal(schedule);
                }}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "timeGridWeek,dayGridMonth"
                }}
                initialView="timeGridWeek"
             />
          </div>
        )}

        {/* Pagination */}
        {meta && (meta.totalPages || 1) > 1 && (
             <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                     Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                     <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, meta.total)}</span> of{" "}
                     <span className="font-medium text-gray-700 dark:text-white">{meta.total}</span> items
                </p>
                <div className="flex items-center gap-2">
                     <button
                         onClick={() => setPage((p) => Math.max(1, p - 1))}
                         disabled={page === 1}
                         className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                     >
                         <ChevronLeftIcon className="size-4" />
                         Previous
                     </button>
                     <div className="flex items-center gap-1.5 px-2">
                         <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                         <span className="text-sm text-gray-400">/</span>
                         <span className="text-sm text-gray-500 dark:text-gray-400">{meta.totalPages || 1}</span>
                     </div>
                     <button
                         onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
                         disabled={page === (meta.totalPages || 1)}
                         className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                     >
                         Next
                         <AngleRightIcon className="size-4" />
                     </button>
                </div>
             </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        className="max-w-md"
        title={selectedSchedule ? "Update Schedule" : "Create Schedule"}
        description="Manage class timetables, timings, and attendance tolerances."
        footer={
           <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="schedule-form"
                className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
              >
                {selectedSchedule ? "Update" : "Create"}
              </button>
           </div>
        }
      >
        <div className="p-1">
          <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4">
            <CustomSelect
              label="Class"
              value={formData.classId}
              onChange={(val) => setFormData({ ...formData, classId: String(val) })}
              options={classes.map(c => ({ label: c.name, value: String(c.id) }))}
              placeholder="Select Class"
            />
            
            <CustomSelect
              label="Academic Year"
              value={formData.academicYearId}
              onChange={(val) => setFormData({ ...formData, academicYearId: String(val) })}
              options={academicYears.map(y => ({ label: y.name, value: String(y.id) }))}
              placeholder="Select Academic Year"
            />

            <CustomSelect
              label="Day of Week"
              value={formData.dayOfWeek}
              onChange={(val) => setFormData({ ...formData, dayOfWeek: String(val) })}
              options={DAYS_OF_WEEK}
            />

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</label>
                 <input
                   type="time"
                   value={formData.startTime}
                   onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                   className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                   required
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</label>
                 <input
                   type="time"
                   value={formData.endTime}
                   onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                   className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                   required
                 />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <NumberInput
                    label="Late Tolerance (Min)"
                    value={formData.lateToleranceMinutes}
                    onChange={(val) => setFormData({ ...formData, lateToleranceMinutes: Number(val) })}
                    placeholder="0"
                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                />
                <NumberInput
                    label="Early Leave (Min)"
                    value={formData.earlyLeaveThresholdMinutes}
                    onChange={(val) => setFormData({ ...formData, earlyLeaveThresholdMinutes: Number(val) })}
                    placeholder="0"
                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                />
            </div>

          </form>
        </div>
      </Modal>

      {/* Student List Modal */}
      {studentListClassId && (
        <StudentListModal 
            classId={studentListClassId} 
            isOpen={!!studentListClassId} 
            onClose={() => setStudentListClassId(null)} 
        />
      )}

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ClassSchedules;
