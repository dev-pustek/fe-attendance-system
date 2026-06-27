import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// ─── API Layer ───
import { useTeachingSessions, useTeachingSessionsInfinite } from "../../../api/hooks/useAttendance";
import { useClassSubjects, useAcademicYears, useClasses, useTeachingScheduleTemplates } from "../../../api/hooks/useAcademic";
import { useEffectiveScheduleRules } from "../../../api/hooks/useRules";
import { TeachingSession, CreateTeachingSessionDto, UpdateTeachingSessionDto } from "../../../api/types/attendance";
import { profilesService } from "../../../api/services/profilesService";
import { attendanceService } from "../../../api/services/attendanceService";
import { academicService } from "../../../api/services/academicService";
import { useAuthStore } from "../../../store/authStore";

// ─── Layout Components ───
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";

// ─── Table Components ───
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";

// ─── Form & Modal Components ───
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import DatePicker from "../../../components/molecules/DatePicker";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import Switch from "../../../components/atoms/Switch";
import NumberInput from "../../../components/molecules/NumberInput";

// ─── Dialogs & Feedback ───
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../utils/toast";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";

// ─── Mobile Card ───
import TeachingSessionCard from "./TeachingSessionCard";

import GenerateSessionsModal from "./GenerateSessionsModal";

// ─── Hooks ───
import { useDebounce } from "../../../hooks/useDebounce";

// ─── Icons ───
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  ChevronLeftIcon,
  AngleRightIcon,
  ChevronDownIcon,
  FilterIcon,
  CalenderIcon,
  MoreDotIcon,
  UserCircleIcon,
  SearchIcon,
  CloseIcon,
  GridIcon
} from "../../../components/atoms/Icons";
import { format } from "date-fns";

// ─── Helpers ───
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Validation Schema ───
const teachingSessionSchema = z.object({
  classSubjectId: z.number().min(1, "Mata Pelajaran Kelas wajib dipilih"),
  actualTeacherId: z.string().min(1, "Guru aktual wajib dipilih"),
  sessionDate: z.string().min(1, "Tanggal sesi wajib diisi"),
  startTime: z.string().min(1, "Waktu mulai wajib diisi"),
  endTime: z.string().min(1, "Waktu selesai wajib diisi"),
  periodInfo: z.string().optional(),
  isSubstitution: z.boolean().default(false),
  substituteForTeacherId: z.string().nullable().optional(),
  isCancelled: z.boolean().default(false),
  notes: z.string().nullable().optional(),
});
type TeachingSessionFormValues = z.infer<typeof teachingSessionSchema>;

// ─── Components ───
const RowActionMenu = ({ onEdit, onDelete, onViewAttendance }: { onEdit: () => void, onDelete: () => void, onViewAttendance: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200">
        <MoreDotIcon className="size-5" />
      </button>
      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)}
        className="absolute right-0 top-full z-20 mt-1 w-44 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900">
        <DropdownItem 
          onClick={() => { setIsOpen(false); onViewAttendance(); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          <UserCircleIcon className="size-3.5" /> Lihat Kehadiran
        </DropdownItem>
        <DropdownItem 
          onClick={() => { setIsOpen(false); onEdit(); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          <PencilIcon className="size-3.5" /> Edit
        </DropdownItem>
        <DropdownItem 
          onClick={() => { setIsOpen(false); onDelete(); }} 
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
        >
          <TrashBinIcon className="size-3.5" /> Hapus
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

const TeachingSessions: React.FC = () => {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { confirm, confirmState } = useConfirm();

  const isGlobalView = (() => {
    if (!user) return false;
    const roles = [
      ...(user.roles?.map((r) => r.name.toLowerCase()) || []),
      ...(user.userTypes?.map((t) => t.toLowerCase()) || []),
      ...(user.typeAssignments?.map((t) => t.userType?.name.toLowerCase() || "") || []),
    ].filter(Boolean);
    return roles.some((r) => 
      ["admin", "super admin", "piket", "kurikulum", "kepala sekolah"].some(globalRole => r.includes(globalRole))
    );
  })();

  // ─── Pagination & Filters ───
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [academicYearIdFilter, setAcademicYearIdFilter] = useState("");
  const [classIdFilter, setClassIdFilter] = useState("");
  const [classSubjectIdFilter, setClassSubjectIdFilter] = useState("");
  const [teacherIdFilter, setTeacherIdFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, classSubjectIdFilter, teacherIdFilter, dateFilter, statusFilter]);

  // ─── Queries ───
  const params = {
    classSubjectId: classSubjectIdFilter ? Number(classSubjectIdFilter) : undefined,
    actualTeacherId: !isGlobalView ? (user?.public_id || String(user?.id)) : (teacherIdFilter || undefined),
    sessionDate: dateFilter || undefined,
    isCancelled: statusFilter === "" ? undefined : statusFilter === "true",
  };

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useTeachingSessions({
    ...params,
    page,
    limit,
  });

  const infiniteQuery = useTeachingSessionsInfinite(params);
  const infiniteItems = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap((p) => p.data) || [];
  }, [infiniteQuery.data]);

  const { data: academicYearsRes } = useAcademicYears({ limit: 100 });
  const academicYearOptions = (academicYearsRes?.data || []).map(ay => ({
    label: ay.name,
    value: String(ay.id)
  }));

  const { data: classesRes } = useClasses({ 
    limit: 100, 
    academicYearId: academicYearIdFilter ? Number(academicYearIdFilter) : undefined 
  });
  const classOptions = (classesRes?.data || []).map(c => ({
    label: c.name,
    value: String(c.id)
  }));

  const { data: classSubjectsRes } = useClassSubjects({ 
    limit: 100, 
    academicYearId: academicYearIdFilter ? Number(academicYearIdFilter) : undefined,
    classId: classIdFilter ? Number(classIdFilter) : undefined 
  });
  const classSubjectOptions = (classSubjectsRes?.data || []).map(cs => ({
    label: cs.subject?.name || "Unknown Subject",
    value: String(cs.id)
  }));

  // ─── Search Teachers & Substitutes ───
  const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);
  const searchTeachers = useCallback(async (term: string) => {
    setIsSearchingTeachers(true);
    try {
      const employees = await profilesService.getEmployees({ search: term, limit: 10 });
      setTeacherOptions(employees.data.map((e) => ({ label: e.user?.name || "Unknown", value: e.user?.public_id || "", subLabel: e.user?.email })));
    } catch { } finally { setIsSearchingTeachers(false); }
  }, []);

  const [isSearchingSubstitute, setIsSearchingSubstitute] = useState(false);
  const [substituteOptions, setSubstituteOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);
  const searchSubstitute = useCallback(async (term: string) => {
    setIsSearchingSubstitute(true);
    try {
      const employees = await profilesService.getEmployees({ search: term, limit: 10 });
      setSubstituteOptions(employees.data.map((e) => ({ label: e.user?.name || "Unknown", value: e.user?.public_id || "", subLabel: e.user?.email })));
    } catch { } finally { setIsSearchingSubstitute(false); }
  }, []);

  const activeAcademicYear = (academicYearsRes?.data || []).find(ay => ay.isActive);
  const [modalClassId, setModalClassId] = useState<string>("");

  const { data: modalClassesRes } = useClasses({
    limit: 100,
    academicYearId: activeAcademicYear?.id ? Number(activeAcademicYear.id) : undefined
  });
  const modalClassOptions = (modalClassesRes?.data || []).map(c => ({
    label: c.name,
    value: String(c.id)
  }));

  const { data: modalClassSubjectsRes } = useClassSubjects({
    limit: 100,
    classId: modalClassId ? Number(modalClassId) : undefined
  });
  const modalClassSubjectOptions = (modalClassSubjectsRes?.data || []).map(cs => ({
    label: cs.subject?.name || "Unknown",
    value: String(cs.id)
  }));

  // ─── Form State ───
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<TeachingSession | null>(null);

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<TeachingSessionFormValues>({
    resolver: zodResolver(teachingSessionSchema),
    defaultValues: { classSubjectId: 0, actualTeacherId: "", sessionDate: "", startTime: "", endTime: "", periodInfo: "", isSubstitution: false, substituteForTeacherId: null, isCancelled: false, notes: "" }
  });

  const watchIsSubstitution = watch("isSubstitution");
  const watchActualTeacherId = watch("actualTeacherId");
  const watchSessionDate = watch("sessionDate");

  const { data: scheduleTemplatesRes, isLoading: isTemplatesLoading } = useTeachingScheduleTemplates({
    teacherId: watchActualTeacherId || undefined,
    limit: 100
  });
  const scheduleTemplates = scheduleTemplatesRes?.data || [];

  const groupedScheduleTemplates = useMemo(() => {
    const dayMap: Record<string, string> = {
      Monday: "Senin", Tuesday: "Selasa", Wednesday: "Rabu", 
      Thursday: "Kamis", Friday: "Jumat", Saturday: "Sabtu", Sunday: "Minggu"
    };
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    const groups: Record<string, typeof scheduleTemplates> = {};
    scheduleTemplates.forEach(t => {
      if (!t.dayOfWeek) return;
      const normalizedDay = t.dayOfWeek.charAt(0).toUpperCase() + t.dayOfWeek.slice(1).toLowerCase();
      if (!groups[normalizedDay]) groups[normalizedDay] = [];
      groups[normalizedDay].push(t);
    });

    return Object.keys(groups)
      .sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b))
      .map(dayKey => ({
        dayKey,
        dayName: dayMap[dayKey] || dayKey,
        templates: groups[dayKey]
      }));
  }, [scheduleTemplates]);

  const { data: effectiveRulesRes } = useEffectiveScheduleRules({
    classId: modalClassId || undefined
  });
  
  const effectiveClassRules = useMemo(() => {
    if (!effectiveRulesRes?.data) return [];
    
    const dayMap: Record<string, string> = {
      MONDAY: "Senin", TUESDAY: "Selasa", WEDNESDAY: "Rabu", 
      THURSDAY: "Kamis", FRIDAY: "Jumat", SATURDAY: "Sabtu", SUNDAY: "Minggu"
    };
    const daysOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

    const rulesArr = (effectiveRulesRes.data as any[]) || [];
    
    return rulesArr
      .sort((a, b) => daysOrder.indexOf(a.dayOfWeek) - daysOrder.indexOf(b.dayOfWeek))
      .map(rule => ({
        dayKey: rule.dayOfWeek,
        dayName: dayMap[rule.dayOfWeek] || rule.dayOfWeek,
        rule
      }));
  }, [effectiveRulesRes]);

  // Auto-fill schedule based on effective rules when class or date changes
  useEffect(() => {
    if (!modalClassId || !watchSessionDate || !effectiveRulesRes?.data || selectedEntity) return;

    const [year, month, day] = watchSessionDate.split('-');
    if (!year || !month || !day) return;
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(dateObj.getTime())) return;

    const daysArr = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const currentDay = daysArr[dateObj.getDay()];

    const rulesArr = (effectiveRulesRes.data as any[]) || [];
    const ruleForDay = rulesArr.find(r => r.dayOfWeek === currentDay);

    if (ruleForDay) {
      if (ruleForDay.startTime) setValue("startTime", ruleForDay.startTime.slice(0, 5));
      if (ruleForDay.endTime) setValue("endTime", ruleForDay.endTime.slice(0, 5));
    }
  }, [modalClassId, watchSessionDate, effectiveRulesRes, setValue, selectedEntity]);

  const handleOpenModal = (entity?: TeachingSession) => {
    if (entity) {
      setSelectedEntity(entity);
      if (entity.actualTeacher) {
        setTeacherOptions([{ label: entity.actualTeacher.name, value: entity.actualTeacherId }]);
      }
      if (entity.substituteForTeacher && entity.substituteForTeacherId) {
        setSubstituteOptions([{ label: entity.substituteForTeacher.name, value: entity.substituteForTeacherId }]);
      }
      if (entity.classSubject) {
        setModalClassId(String(entity.classSubject.classId));
      } else {
        setModalClassId("");
      }
      reset({
        classSubjectId: entity.classSubjectId,
        actualTeacherId: entity.actualTeacherId,
        sessionDate: entity.sessionDate,
        startTime: entity.startTime.slice(0, 5),
        endTime: entity.endTime.slice(0, 5),
        periodInfo: entity.periodInfo || "",
        isSubstitution: entity.isSubstitution,
        substituteForTeacherId: entity.substituteForTeacherId,
        isCancelled: entity.isCancelled,
        notes: entity.notes,
      });
    } else {
      setSelectedEntity(null);
      setModalClassId("");
      reset({ classSubjectId: 0, actualTeacherId: "", sessionDate: format(new Date(), "yyyy-MM-dd"), startTime: "", endTime: "", periodInfo: "", isSubstitution: false, substituteForTeacherId: null, isCancelled: false, notes: "" });
    }
    setIsModalOpen(true);
  };

  const onSubmitForm = async (data: TeachingSessionFormValues) => {
    const confirmed = await confirm({
      variant: selectedEntity ? "update" : "create",
      title: selectedEntity ? "Perbarui Sesi Mengajar" : "Rekam Sesi Mengajar",
      message: `Apakah Anda yakin ingin ${selectedEntity ? "memperbarui" : "merekam"} sesi mengajar ini?`,
    });
    if (!confirmed) return;

    try {
      // Backend validation requires HH:MM:SS format
      const newStart = data.startTime.length === 5 ? `${data.startTime}:00` : data.startTime;
      const newEnd = data.endTime.length === 5 ? `${data.endTime}:00` : data.endTime;

      // Overlap Validation Check: Teacher Conflict
      if (data.actualTeacherId && data.sessionDate) {
        const existingSessionsResp = await attendanceService.getTeachingSessions({
          actualTeacherId: data.actualTeacherId,
          sessionDate: data.sessionDate,
          limit: 100,
        });
        const existingSessions = existingSessionsResp.data || [];
        
        const conflictingSession = existingSessions.find(session => {
           // Skip if it's the session we're currently updating
           if (selectedEntity && session.id === selectedEntity.id) return false;
           // Skip cancelled sessions (they don't count as conflicts)
           if (session.isCancelled) return false;
           
           const existStart = session.startTime.slice(0, 5);
           const existEnd = session.endTime.slice(0, 5);
           const checkStart = newStart.slice(0, 5);
           const checkEnd = newEnd.slice(0, 5);
           // Overlap happens if new session starts before existing ends, AND existing starts before new ends
           return checkStart < existEnd && existStart < checkEnd;
        });

        if (conflictingSession) {
           showError(
               `Guru ini sudah memiliki sesi mengajar pada waktu yang bersinggungan di kelas ${conflictingSession.classSubject?.class?.name || "Lainnya"} (${conflictingSession.startTime.slice(0, 5)} - ${conflictingSession.endTime.slice(0, 5)}).`,
               "Jadwal Bentrok (Guru)"
           );
           return; // Strict Block
        }
      }

      // Overlap Validation Check: Class Conflict
      if (modalClassId && data.sessionDate) {
        // Use 'any' cast if classId is not explicitly in the type definition, but supported by the backend
        const existingClassSessionsResp = await (attendanceService.getTeachingSessions as any)({
          classId: modalClassId,
          sessionDate: data.sessionDate,
          limit: 100,
        });
        const existingClassSessions: TeachingSession[] = existingClassSessionsResp.data || [];
        
        const conflictingClassSession = existingClassSessions.find(session => {
           if (selectedEntity && session.id === selectedEntity.id) return false;
           if (session.isCancelled) return false;
           
           const existStart = session.startTime.slice(0, 5);
           const existEnd = session.endTime.slice(0, 5);
           const checkStart = newStart.slice(0, 5);
           const checkEnd = newEnd.slice(0, 5);
           return checkStart < existEnd && existStart < checkEnd;
        });

        if (conflictingClassSession) {
           showError(
               `Kelas ini sudah memiliki jadwal mata pelajaran ${conflictingClassSession.classSubject?.subject?.name || "Lainnya"} pada waktu tersebut (${conflictingClassSession.startTime.slice(0, 5)} - ${conflictingClassSession.endTime.slice(0, 5)}).`,
               "Jadwal Bentrok (Kelas)"
           );
           return; // Strict Block
        }
      }

      const formattedData = {
        ...data,
        startTime: newStart,
        endTime: newEnd,
      };

      if (selectedEntity) {
        await updateMutation.mutateAsync({ id: selectedEntity.id, data: formattedData as UpdateTeachingSessionDto });
        showSuccess("Sesi berhasil diperbarui!");
      } else {
        const createdSession = await createMutation.mutateAsync(formattedData as CreateTeachingSessionDto);
        showSuccess("Sesi berhasil direkam!");

        // --- Auto Generate Attendance ---
        try {
          if (modalClassId && createdSession.data?.id) {
            const enrollmentsRes = await academicService.getClassEnrollments({
              limit: 200,
              classId: modalClassId,
              status: "active",
            });
            const studentIds = enrollmentsRes.data.map((s: any) => s.user?.public_id).filter(Boolean) as string[];
            
            if (studentIds.length > 0) {
              const records = studentIds.map(studentId => ({
                studentId,
                status: "present" as const,
                remarks: "Auto-generated",
              }));
              
              await attendanceService.bulkCreateSubjectAttendance({
                teachingSessionId: createdSession.data.id,
                records,
              });
            }
          }
        } catch (autoErr) {
          console.error("Auto-attendance generation failed", autoErr);
          showError(autoErr, "Sesi terekam, tapi gagal meng-generate daftar absensi otomatis.");
        }
        // ------------------------------
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Gagal menyimpan sesi");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Sesi",
      message: "Apakah Anda yakin ingin menghapus sesi mengajar ini? Tindakan ini tidak dapat dibatalkan.",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      showSuccess("Sesi berhasil dihapus!");
    } catch (error) {
      showError(error, "Gagal menghapus sesi");
    }
  };

  // ─── Bulk Operations ───
  const items = response?.data || [];
  const displayItems = isMobile ? infiniteItems : items;
  const allSelected = displayItems.length > 0 && displayItems.every((item) => selectedIds.has(item.id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayItems.map((item) => item.id)));
  };

  const toggleOne = (id: number | string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Pilihan",
      message: `Hapus ${selectedIds.size} sesi mengajar? Tindakan ini tidak dapat dibatalkan.`,
    });
    if (!confirmed) return;
    for (const id of selectedIds) {
      try { await deleteMutation.mutateAsync(id); } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    showSuccess(`${selectedIds.size} sesi berhasil dihapus.`);
  };

  // ─── Export (Mock implementations for DataActionsMenu) ───
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // Typically: const blob = await entityService.exportEntitiesExcel(params);
      // Mocking here as attendanceService might not have it natively configured yet for teaching sessions
      showSuccess("Export Excel (Mock) berhasil!");
    } catch (err) {
      showError(err, "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    // PDF Export
    showSuccess("Export PDF (Mock) berhasil!");
  };

  // ─── Infinite Scroll ───
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobile) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
          infiniteQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, infiniteQuery]);

  const handleViewAttendance = (session: TeachingSession) => {
    const classId = session.classSubject?.class?.id || session.classSubject?.classId;
    navigate(`/attendance/subject-attendances?teachingSessionId=${session.id}&classId=${classId}`);
  };

  return (
    <>
      <PageMeta title="Sesi Mengajar | SIAPUS" description="Kelola dan lacak sesi mengajar aktual dan penggantian." />
      <PageBreadcrumb pageTitle="Sesi Mengajar" />

      <div className="space-y-6">
        {/* 2. Page Header (Desktop) */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <CalenderIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sesi Mengajar</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Catatan kejadian pelajaran aktual, termasuk penggantian.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataActionsMenu
              isExporting={isExporting}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
            />
            {isGlobalView && (
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[.98] dark:border-white/[0.1] dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-white/[0.04]"
              >
                <span className="text-base leading-none">✨</span>
                Generate Sesi
              </button>
            )}
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
            >
              <PlusIcon className="size-4 fill-current" />
              Rekam Sesi
            </button>
          </div>
        </div>

        {/* 3. Mobile FAB */}
        {isMobile && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
            <DataActionsMenu isMobileFab={true} isExporting={isExporting} onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} />
            
            {isGlobalView && (
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="flex size-14 items-center justify-center rounded-full bg-white text-gray-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-gray-500/20 transition-transform active:scale-95 dark:bg-gray-800 dark:text-white"
              >
                <span className="text-xl leading-none">✨</span>
              </button>
            )}

            <button
              onClick={() => handleOpenModal()}
              className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
            >
              <PlusIcon className="size-6 fill-white" />
            </button>
          </div>
        )}

        {/* 4. Advanced Filter Card */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-white/[0.05] dark:bg-white/[0.02]">
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <FilterIcon className="size-5 text-brand-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Filter
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gunakan kriteria di bawah ini untuk memfilter data berdasarkan guru, mata pelajaran, dll.
              </p>
            </div>
            <div className="shrink-0 ml-4">
              <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
            </div>
          </button>
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden min-h-0">
              <div className="px-5 pb-5">
                <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12">
                  <div className="space-y-1.5 lg:col-span-4">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tahun Ajaran</Label>
                    <CustomSelect
                      value={academicYearIdFilter}
                      onChange={(val) => { 
                        setAcademicYearIdFilter(String(val)); 
                        setClassIdFilter("");
                        setClassSubjectIdFilter("");
                        setPage(1); 
                      }}
                      onClear={() => { 
                        setAcademicYearIdFilter(""); 
                        setClassIdFilter("");
                        setClassSubjectIdFilter("");
                        setPage(1); 
                      }}
                      placeholder="Pilih Tahun Ajaran"
                      options={academicYearOptions}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-4">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kelas</Label>
                    <CustomSelect
                      value={classIdFilter}
                      onChange={(val) => { 
                        setClassIdFilter(String(val)); 
                        setClassSubjectIdFilter("");
                        setPage(1); 
                      }}
                      onClear={() => { 
                        setClassIdFilter(""); 
                        setClassSubjectIdFilter("");
                        setPage(1); 
                      }}
                      placeholder={academicYearIdFilter ? "Pilih Kelas" : "Pilih Tahun Ajaran Dahulu"}
                      options={classOptions}
                      disabled={!academicYearIdFilter}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-4">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Mata Pelajaran</Label>
                    <CustomSelect
                      value={classSubjectIdFilter}
                      onChange={(val) => { setClassSubjectIdFilter(String(val)); setPage(1); }}
                      onClear={() => { setClassSubjectIdFilter(""); setPage(1); }}
                      placeholder={classIdFilter ? "Pilih Mata Pelajaran" : "Pilih Kelas Dahulu"}
                      options={classSubjectOptions}
                      disabled={!classIdFilter}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>
                  {isGlobalView && (
                    <div className="space-y-1.5 lg:col-span-3">
                      <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Guru</Label>
                      <SearchableAsyncSelect
                        placeholder="Semua Guru"
                        value={teacherIdFilter}
                        onChange={(val) => { setTeacherIdFilter(String(val)); setPage(1); }}
                        onSearch={searchTeachers}
                        options={teacherOptions}
                        isLoading={isSearchingTeachers}
                      />
                    </div>
                  )}
                  <div className={`space-y-1.5 ${isGlobalView ? "lg:col-span-3" : "lg:col-span-4"}`}>
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Sesi</Label>
                    <DatePicker
                      value={dateFilter}
                      onChange={(val) => { setDateFilter(val); setPage(1); }}
                      placeholder="Semua Tanggal"
                    />
                  </div>
                  <div className={`space-y-1.5 ${isGlobalView ? "lg:col-span-3" : "lg:col-span-4"}`}>
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                    <CustomSelect
                      value={statusFilter}
                      onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
                      onClear={() => { setStatusFilter(""); setPage(1); }}
                      placeholder="Semua Status"
                      options={[
                        { label: "Aktif", value: "false" },
                        { label: "Dibatalkan", value: "true" },
                      ]}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>
                  <div className={`flex items-end justify-end gap-3 ${isGlobalView ? "lg:col-span-3" : "lg:col-span-4"}`}>
                    <button onClick={() => {
                      setAcademicYearIdFilter("");
                      setClassIdFilter("");
                      setClassSubjectIdFilter("");
                      setTeacherIdFilter("");
                      setDateFilter("");
                      setStatusFilter("");
                      setPage(1);
                    }} className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300">
                      Reset Filter
                    </button>
                    <button onClick={() => setIsFilterOpen(false)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-95">
                      <SearchIcon className="size-4 fill-current" />
                      Cari
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Toolbar (Bulk Actions) */}
        <TableToolbar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          bulkActions={[
            { label: "Hapus Terpilih", icon: <TrashBinIcon className="size-3.5" />, onClick: handleBulkDelete, variant: "danger" }
          ]}
        />

        {/* 6. Content */}
        {isMobile ? (
          <div className="space-y-3">
            {displayItems.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} terpilih` : "Pilih semua"}
                </span>
              </div>
            )}

            {infiniteQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.06] dark:bg-white/[0.02] animate-pulse space-y-3">
                    <div className="flex justify-between">
                      <div className="h-4 w-24 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                      <div className="h-4 w-16 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                    </div>
                    <div className="h-4 w-3/4 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                    <div className="h-3 w-1/2 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            ) : infiniteItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                  <CalenderIcon className="size-7 opacity-30" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Sesi mengajar tidak ditemukan.</p>
                <button onClick={() => handleOpenModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400">
                  <PlusIcon className="size-3 fill-current" /> Rekam Sesi Pertama
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {infiniteItems.map((item) => (
                  <TeachingSessionCard
                    key={item.id}
                    entity={item}
                    isSelected={selectedIds.has(item.id)}
                    onToggle={() => toggleOne(item.id)}
                    onEdit={() => handleOpenModal(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            )}
            
            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {infiniteQuery.isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!infiniteQuery.hasNextPage && infiniteItems.length > 0 && (
                <p className="text-xs text-gray-400">Semua data dimuat</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <TableRow>
                  <TableCell isHeader className="w-10 px-4 py-3.5">
                    <Checkbox checked={allSelected} onChange={toggleAll} />
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tanggal & Waktu
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kelas & Mata Pelajaran
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Guru Aktual
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Unit
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading ? (
                  <SkeletonTable cols={7} hasCheckbox rows={limit} />
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                          <CalenderIcon className="size-5 opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Sesi mengajar tidak ditemukan.</p>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                          <PlusIcon className="size-3" /> Rekam sesi pertama
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((session) => {
                    const isSelected = selectedIds.has(session.id);
                    return (
                      <TableRow key={session.id} className={`group transition-colors ${isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"}`}>
                        <TableCell className="w-10 px-4 py-4">
                          <Checkbox checked={isSelected} onChange={() => toggleOne(session.id)} />
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{format(new Date(session.sessionDate), "dd MMM yyyy")}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{session.classSubject?.subject?.name || "Tidak Diketahui"}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{session.classSubject?.class?.name || "Tidak Diketahui"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{session.actualTeacher?.name || "Tidak Diketahui"}</p>
                            {session.isSubstitution && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                                Pengganti untuk {session.substituteForTeacher?.name || "Tidak Ada"}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <span className="inline-flex py-1 px-3 rounded-lg bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-300">
                            {session.teachingUnits} Unit
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <Badge color={session.isCancelled ? "error" : "success"}>
                            {session.isCancelled ? "Dibatalkan" : "Aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <RowActionMenu
                            onEdit={() => handleOpenModal(session)}
                            onDelete={() => handleDelete(session.id)}
                            onViewAttendance={() => handleViewAttendance(session)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {response && response.meta.total > 0 && (
              <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Menampilkan <span className="font-semibold text-gray-600 dark:text-gray-300">{(page - 1) * limit + 1}–{Math.min(page * limit, response.meta.total)}</span> dari <span className="font-semibold text-gray-600 dark:text-gray-300">{response.meta.total}</span> sesi
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/[0.05]">
                    <ChevronLeftIcon className="size-3.5" /> Sebelumnya
                  </button>
                  <button onClick={() => setPage((p) => Math.min(response.meta.totalPages, p + 1))} disabled={page === response.meta.totalPages || response.meta.totalPages === 0} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/[0.05]">
                    Selanjutnya <AngleRightIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-xl"
        title={selectedEntity ? "Perbarui Sesi Mengajar" : "Rekam Sesi Mengajar Baru"}
        description="Masukkan detail kejadian pelajaran, termasuk guru aktual dan unit yang diajarkan."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              type="submit"
              form="teaching-session-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) && <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedEntity ? "Perbarui Sesi" : "Rekam Sesi"}
            </button>
          </div>
        }
      >
        <form id="teaching-session-form" onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <Controller name="actualTeacherId" control={control} render={({ field }) => (
            <div className="space-y-1.5">
              <Label>Guru Aktual</Label>
              <SearchableAsyncSelect
                placeholder="Cari guru..."
                value={field.value}
                onChange={(val) => field.onChange(String(val))}
                onSearch={searchTeachers}
                options={teacherOptions}
                isLoading={isSearchingTeachers}
              />
              {errors.actualTeacherId && <p className="text-xs text-error-500">{errors.actualTeacherId.message}</p>}
            </div>
          )} />

          {watchActualTeacherId && groupedScheduleTemplates.length > 0 && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-brand-700 dark:text-brand-400">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Jadwal Rutin Guru
              </h4>
              <div className="space-y-3">
                {groupedScheduleTemplates.map(group => (
                  <div key={group.dayKey}>
                    <h5 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      {group.dayName}
                    </h5>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.templates.map(template => (
                        <div key={template.id} className="flex flex-col justify-center rounded-lg border border-brand-200/60 bg-white p-2.5 shadow-sm dark:border-white/[0.05] dark:bg-gray-900/50">
                          <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200" title={template.classSubject?.subject?.name}>
                            {template.classSubject?.subject?.name}
                          </p>
                          <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400" title={template.classSubject?.class?.name}>
                            {template.classSubject?.class?.name}
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{template.startTime.slice(0, 5)} - {template.endTime.slice(0, 5)} WIB</p>
                            <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">{template.plannedUnits} Unit</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modalClassId && effectiveClassRules.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Jadwal Efektif Kelas (Hirarki)
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {effectiveClassRules.map(item => (
                  <div key={item.dayKey} className="flex flex-col justify-center rounded-lg border border-blue-200/60 bg-white p-2.5 shadow-sm dark:border-white/[0.05] dark:bg-gray-900/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {item.dayName}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{item.rule.startTime.slice(0, 5)} - {item.rule.endTime.slice(0, 5)} WIB</p>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                        {item.rule.context?.contextType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Kelas</Label>
              <CustomSelect
                placeholder="Pilih kelas..."
                value={modalClassId}
                onChange={(val) => {
                  setModalClassId(String(val));
                  setValue("classSubjectId", 0);
                }}
                options={modalClassOptions}
              />
            </div>

            <Controller name="classSubjectId" control={control} render={({ field }) => (
              <div className="space-y-1.5">
                <Label>Mata Pelajaran</Label>
                <CustomSelect
                  placeholder={modalClassId ? "Pilih mata pelajaran..." : "Pilih kelas dahulu"}
                  value={String(field.value || "")}
                  onChange={(val) => field.onChange(Number(val))}
                  options={modalClassSubjectOptions}
                  disabled={!modalClassId}
                />
                {errors.classSubjectId && <p className="text-xs text-error-500">{errors.classSubjectId.message}</p>}
              </div>
            )} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller name="sessionDate" control={control} render={({ field }) => (
              <div className="space-y-1.5">
                <Label>Tanggal Sesi</Label>
                <DatePicker value={field.value} onChange={field.onChange} />
                {errors.sessionDate && <p className="text-xs text-error-500">{errors.sessionDate.message}</p>}
              </div>
            )} />

            <div className="space-y-1.5">
              <Label>Jam Pelajaran (Mapel Ke)</Label>
              <Input type="text" placeholder="cth. 1, 1-2, 3-4" {...register("periodInfo")} />
              {errors.periodInfo && <p className="text-xs text-error-500">{errors.periodInfo.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller name="startTime" control={control} render={({ field }) => (
              <div className="space-y-1.5">
                <Label>Waktu Mulai</Label>
                <DatePicker type="time" value={field.value} onChange={field.onChange} />
                {errors.startTime && <p className="text-xs text-error-500">{errors.startTime.message}</p>}
              </div>
            )} />

            <Controller name="endTime" control={control} render={({ field }) => (
              <div className="space-y-1.5">
                <Label>Waktu Selesai</Label>
                <DatePicker type="time" value={field.value} onChange={field.onChange} />
                {errors.endTime && <p className="text-xs text-error-500">{errors.endTime.message}</p>}
              </div>
            )} />
          </div>

          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/30 p-4 dark:border-white/5 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Pelajaran Pengganti</Label>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Apakah pelajaran ini menggantikan guru lain?</p>
              </div>
              <Controller name="isSubstitution" control={control} render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange} />
              )} />
            </div>

            {watchIsSubstitution && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                <Controller name="substituteForTeacherId" control={control} render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label>Pengganti Untuk</Label>
                    <SearchableAsyncSelect
                      placeholder="Pilih guru asli..."
                      value={field.value || ""}
                      onChange={(val) => field.onChange(String(val))}
                      onSearch={searchSubstitute}
                      options={substituteOptions}
                      isLoading={isSearchingSubstitute}
                    />
                    {errors.substituteForTeacherId && <p className="text-xs text-error-500">{errors.substituteForTeacherId.message}</p>}
                  </div>
                )} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-gray-900 dark:text-white">Sesi Dibatalkan</Label>
              <p className="text-xs text-gray-500 italic">Tandai sesi ini sebagai dibatalkan.</p>
            </div>
            <Controller name="isCancelled" control={control} render={({ field }) => (
              <Switch checked={field.value} onChange={field.onChange} />
            )} />
          </div>

          <div className="space-y-1.5">
            <Label>Catatan (Opsional)</Label>
            <textarea
              {...register("notes")}
              placeholder="Topik pelajaran atau info tambahan..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none h-24"
            />
            {errors.notes && <p className="text-xs text-error-500">{errors.notes.message}</p>}
          </div>
        </form>
      </Modal>

      <GenerateSessionsModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} />

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default TeachingSessions;
