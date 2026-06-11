import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  useSubjectAttendances,
  useSubjectAttendancesInfinite,
  useAttendanceStatuses,
  useBulkSubjectAttendance,
} from "../../../api/hooks/useAttendance";
import { useAuthStore } from "../../../store/authStore";
import { useClasses, useClassSubjects, useAcademicYears } from "../../../api/hooks/useAcademic";
import { profilesService } from "../../../api/services/profilesService";
import { academicService } from "../../../api/services/academicService";
import { attendanceService } from "../../../api/services/attendanceService";
import {
  SubjectAttendance,
  CreateSubjectAttendanceDto,
  UpdateSubjectAttendanceDto,
  TeachingSession,
} from "../../../api/types/attendance";
import { StudentProfile } from "../../../api/types/profiles";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import SubjectAttendanceCard from "./SubjectAttendanceCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import Checkbox from "../../../components/atoms/Checkbox";
import VisiaDatePicker from "../../../components/molecules/DatePicker";
import {
  PencilIcon,
  TrashBinIcon,
  PlusIcon,
  ChevronLeftIcon,
  AngleRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UserIcon,
  CalenderIcon,
  TimeIcon,
  CloseIcon,
  CheckCircleIcon,
  GroupIcon,
  DownloadIcon,
  SearchIcon,
  FilterIcon,
  HorizontaLDots,
  MoreDotIcon,
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Label from "../../../components/atoms/Label";
import Button from "../../../components/atoms/Button";
import { useDebounce } from "../../../hooks/useDebounce";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CYCLE: SubjectAttendance["status"][] = [
  "present",
  "late",
  "absent",
  "excused",
  "sick",
];

const statusMeta: Record<
  string,
  { label: string; color: "success" | "warning" | "error" | "info" | "primary"; bg: string; text: string }
> = {
  present: {
    label: "Present",
    color: "success",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  late: {
    label: "Late",
    color: "warning",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
  },
  absent: {
    label: "Absent",
    color: "error",
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
  },
  excused: {
    label: "Excused",
    color: "info",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
  sick: {
    label: "Sick",
    color: "primary",
    bg: "bg-purple-50 dark:bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
  },
};

const RowActionMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
      <div className="relative flex justify-center">
          <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
          >
              <MoreDotIcon className="size-5" />
          </button>
          <Dropdown
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              className="absolute right-0 top-full z-20 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900"
          >
              <DropdownItem
                  onClick={() => {
                      setIsOpen(false);
                      onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              >
                  <PencilIcon className="size-3.5" /> Edit
              </DropdownItem>
              <DropdownItem
                  onClick={() => {
                      setIsOpen(false);
                      onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
              >
                  <TrashBinIcon className="size-3.5" /> Delete
              </DropdownItem>
          </Dropdown>
      </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatPill: React.FC<{
  label: string;
  value: number;
  total: number;
  colorClass: string;
  bgClass: string;
}> = ({ label, value, total, colorClass, bgClass }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`flex-1 min-w-[100px] rounded-xl p-4 ${bgClass}`}>
      <div className={`text-2xl font-extrabold leading-none tabular-nums ${colorClass}`}>
        {value}
      </div>
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">{label}</div>
      <div className="mt-2 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass.replace("text-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] font-bold mt-1 opacity-60 tabular-nums">{pct}%</div>
    </div>
  );
};

// ─── Inline status badge (clickable cycle) ────────────────────────────────────
const InlineStatusBadge: React.FC<{
  status: string;
  onCycle: () => void;
  loading?: boolean;
}> = ({ status, onCycle, loading }) => {
  const meta = statusMeta[status] || statusMeta["present"];
  return (
    <button
      onClick={onCycle}
      disabled={loading}
      title="Click to change status"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-transparent transition-all hover:scale-105 active:scale-95 cursor-pointer select-none ${meta.bg} ${meta.text} ${loading ? "opacity-50 cursor-not-allowed" : "hover:border-current/30"}`}
    >
      {loading ? (
        <span className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {meta.label}
    </button>
  );
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const SubjectAttendances: React.FC = () => {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
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

  const [searchParams, setSearchParams] = useSearchParams();
  const urlSessionId = searchParams.get("teachingSessionId");
  const urlClassId = searchParams.get("classId");

  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [sessionIdFilter, setSessionIdFilter] = useState(urlSessionId || "");
  const [studentIdFilter, setStudentIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [academicYearIdFilter, setAcademicYearIdFilter] = useState("");
  const [classIdFilter, setClassIdFilter] = useState("");
  const [subjectIdFilter, setSubjectIdFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // Cycling status (inline edit)
  const [cyclingId, setCyclingId] = useState<number | string | null>(null);

  useEffect(() => {
    if (urlSessionId) setSessionIdFilter(urlSessionId);
  }, [urlSessionId]);

  const { confirm, confirmState } = useConfirm();

  const { data: academicYearsRes } = useAcademicYears({ limit: 100 });
  const academicYearOptions = (academicYearsRes?.data || []).map((ay) => ({
    label: ay.name,
    value: String(ay.id),
  }));

  const { data: classSubjectsRes } = useClassSubjects({
    limit: 100,
    academicYearId: academicYearIdFilter || undefined,
    teacherId: !isGlobalView ? (user?.public_id || String(user?.id)) : undefined,
  });

  const uniqueClasses = useMemo(() => {
    const classes = new Map();
    (classSubjectsRes?.data || []).forEach((cs) => {
      if (cs.class) classes.set(cs.class.id, cs.class);
    });
    return Array.from(classes.values()).map((c) => ({
      label: c.name,
      value: String(c.id),
    }));
  }, [classSubjectsRes]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Map();
    (classSubjectsRes?.data || []).forEach((cs) => {
      if (classIdFilter && String(cs.class?.id) !== classIdFilter) return;
      if (cs.subject) subjects.set(cs.subject.id, cs.subject);
    });
    return Array.from(subjects.values()).map((s) => ({
      label: s.name,
      value: String(s.id),
    }));
  }, [classSubjectsRes, classIdFilter]);

  const {
    data: response,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useSubjectAttendances({
    academicYearId: academicYearIdFilter || undefined,
    classId: classIdFilter || undefined,
    subjectId: subjectIdFilter || undefined,
    teacherId: !isGlobalView ? (user?.public_id || String(user?.id)) : undefined,
    teachingSessionId: sessionIdFilter || undefined,
    studentId: studentIdFilter || undefined,
    status: statusFilter || undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
    page,
    limit,
  });

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSubjectAttendancesInfinite({
    academicYearId: academicYearIdFilter || undefined,
    classId: classIdFilter || undefined,
    subjectId: subjectIdFilter || undefined,
    teacherId: !isGlobalView ? (user?.public_id || String(user?.id)) : undefined,
    teachingSessionId: sessionIdFilter || undefined,
    studentId: studentIdFilter || undefined,
    status: statusFilter || undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
  });

  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const selectedIds = React.useRef(new Set<number | string>()); // Simple ref for selection, UI update omitted for brevity unless needed. We'll use state.
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number | string>>(new Set());
  
  const toggleRowSelection = (id: number | string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllRows = () => {
    if (selectedRowIds.size > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(attendances.map(a => a.id)));
    }
  };

  const bulkMutation = useBulkSubjectAttendance();

  const { data: statusesRes } = useAttendanceStatuses();
  const statusOptions = useMemo(() => {
    const apiOptions = (statusesRes?.data || []).map((s) => ({
      label: s.name,
      value: s.code.toLowerCase(),
    }));
    return apiOptions.length > 0
      ? apiOptions
      : [
          { label: "Present", value: "present" },
          { label: "Absent", value: "absent" },
          { label: "Late", value: "late" },
          { label: "Excused", value: "excused" },
          { label: "Sick", value: "sick" },
        ];
  }, [statusesRes]);

  // ─── Single record modal ───────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<SubjectAttendance | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // ─── Bulk Modal ────────────────────────────────────────────────────────────
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStudents, setBulkStudents] = useState<StudentProfile[]>([]);
  const [isLoadingBulk, setIsLoadingBulk] = useState(false);
  const [selectedBulkStudents, setSelectedBulkStudents] = useState<Set<string>>(new Set());
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, string>>({});
  const [bulkRemarks, setBulkRemarks] = useState<Record<string, string>>({});
  const [defaultBulkStatus, setDefaultBulkStatus] = useState("present");
  const [bulkSearch, setBulkSearch] = useState("");

  // ─── Report Modal ──────────────────────────────────────────────────────────
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportParams, setReportParams] = useState({
    classId: "",
    subjectId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [reportSubjectOptions, setReportSubjectOptions] = useState<{ label: string; value: string }[]>([]);

  // ─── Form state ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<CreateSubjectAttendanceDto>({
    teachingSessionId: "",
    studentId: "",
    status: "present",
    remarks: "",
  });

  // Session context (shown in header)
  const [sessionContext, setSessionContext] = useState<TeachingSession | null>(null);

  useEffect(() => {
    if (sessionIdFilter) {
      attendanceService
        .getTeachingSessions({ limit: 1 })
        .catch(() => {});
    }
  }, [sessionIdFilter]);

  useEffect(() => {
    if (reportParams.classId) {
      academicService
        .getClassSubjects({ classId: reportParams.classId })
        .then((res) => {
          setReportSubjectOptions(
            res.data.map((cs) => ({
              label: cs.subject?.name || "Unknown",
              value: String(cs.subjectId),
            }))
          );
        })
        .catch(() => {});
    } else {
      setReportSubjectOptions([]);
    }
  }, [reportParams.classId]);

  const { data: classesRes } = useClasses({ limit: 100 });
  const classOptions = (classesRes?.data || []).map((c) => ({
    label: c.name,
    value: String(c.id),
  }));

  // ─── Student search ────────────────────────────────────────────────────────
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [studentOptions, setStudentOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);
  const [isSearchingSessions, setIsSearchingSessions] = useState(false);
  const [sessionOptions, setSessionOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const searchStudents = useCallback(async (term: string) => {
    setIsSearchingStudents(true);
    try {
      const students = await profilesService.getStudents({ search: term, limit: 10 });
      setStudentOptions(
        students.data.map((s) => ({
          label: s.user?.name || "Unknown",
          value: s.user?.public_id || "",
          subLabel: s.user?.studentProfile?.nis || s.studentId || s.nis || "",
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingStudents(false);
    }
  }, []);

  // ─── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const attendances = useMemo(() => response?.data || [], [response]);

  // ─── Auto-compute session order per class per day ─────────────────────────
  // For each unique (classSubjectId + sessionDate) found in the current page,
  // fetches ALL sibling sessions from the backend, sorts by startTime,
  // and maps sessionId → 1-based order number.
  const [sessionOrderMap, setSessionOrderMap] = useState<Map<number | string, number>>(new Map());

  useEffect(() => {
    // Collect unique (classSubjectId, sessionDate) pairs
    const pairs = new Map<string, { classSubjectId: number; sessionDate: string }>();
    attendances.forEach((record) => {
      const s = record.teachingSession;
      if (!s?.classSubjectId || !s?.sessionDate) return;
      const key = `${s.classSubjectId}-${s.sessionDate}`;
      if (!pairs.has(key)) pairs.set(key, { classSubjectId: s.classSubjectId, sessionDate: s.sessionDate });
    });
    if (pairs.size === 0) return;

    // Fetch sibling sessions for each pair and build the order map
    Promise.all(
      Array.from(pairs.values()).map((pair) =>
        attendanceService.getTeachingSessions({ classSubjectId: pair.classSubjectId, sessionDate: pair.sessionDate, limit: 100 })
          .then((res) => res.data || [])
          .catch(() => [] as typeof res.data)
      )
    ).then((results) => {
      const orderMap = new Map<number | string, number>();
      results.forEach((sessions) => {
        const sorted = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
        sorted.forEach((s, idx) => orderMap.set(s.id, idx + 1));
      });
      setSessionOrderMap(orderMap);
    });
  }, [attendances]);

  const filteredAndSorted = useMemo(() => {
    let list = [...attendances];
    // client-side name search
    if (appliedSearch) {
      const q = appliedSearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.student?.name?.toLowerCase().includes(q) ||
          (r.student as any)?.studentProfile?.nis?.toLowerCase().includes(q) ||
          r.student?.email?.toLowerCase().includes(q)
      );
    }
    if (sortConfig) {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        let valA: string = "";
        let valB: string = "";
        if (key === "student") {
          valA = a.student?.name || "";
          valB = b.student?.name || "";
        } else if (key === "session") {
          valA = a.teachingSession?.sessionDate || "";
          valB = b.teachingSession?.sessionDate || "";
        } else if (key === "status") {
          valA = a.status || "";
          valB = b.status || "";
        } else {
          valA = String((a as any)[key] ?? "");
          valB = String((b as any)[key] ?? "");
        }
        if (valA < valB) return direction === "asc" ? -1 : 1;
        if (valA > valB) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [attendances, appliedSearch, sortConfig]);

  // ─── Stats derived from current page ──────────────────────────────────────
  const stats = useMemo(() => {
    const total = attendances.length;
    const present = attendances.filter((r) => r.status === "present").length;
    const late = attendances.filter((r) => r.status === "late").length;
    const absent = attendances.filter((r) => r.status === "absent").length;
    const excused = attendances.filter((r) => r.status === "excused" || r.status === "sick").length;
    return { total, present, late, absent, excused };
  }, [attendances]);

  const total = response?.meta?.itemCount || 0;
  const totalPages = response?.meta?.pageCount || 1;

  const SortIcon = ({ column }: { column: string }) =>
    sortConfig?.key !== column ? (
      <ChevronUpIcon className="size-3 opacity-20" />
    ) : sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );

  // ─── Inline status cycle ───────────────────────────────────────────────────
  const handleCycleStatus = async (record: SubjectAttendance) => {
    const currentIdx = STATUS_CYCLE.indexOf(record.status as any);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    setCyclingId(record.id);
    try {
      await updateMutation.mutateAsync({
        id: record.id,
        data: { status: nextStatus } as UpdateSubjectAttendanceDto,
      });
    } catch (e) {
      showError("Failed to update status");
    } finally {
      setCyclingId(null);
    }
  };

  // ─── Open single modal ─────────────────────────────────────────────────────
  const handleOpenModal = (record?: SubjectAttendance) => {
    if (record) {
      setSelectedAttendance(record);
      setFormData({
        teachingSessionId: String(record.teachingSessionId),
        studentId: record.studentId,
        status: record.status,
        remarks: record.remarks || "",
      });
      if (record.student) {
        setStudentOptions([{
          label: record.student.name || "Unknown",
          value: record.student.public_id || "",
          subLabel: record.student.email,
        }]);
      }
      if (record.teachingSession) {
        const s = record.teachingSession;
        setSessionOptions([{
          label: `${s.sessionDate} (${s.startTime?.slice(0, 5)})`,
          value: String(s.id),
          subLabel: `${s.classSubject?.class?.name} · ${s.classSubject?.subject?.name}`,
        }]);
      }
    } else {
      setSelectedAttendance(null);
      setFormData({
        teachingSessionId: sessionIdFilter || "",
        studentId: "",
        status: "present",
        remarks: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teachingSessionId || !formData.studentId || !formData.status) {
      showError("Please fill in all required fields");
      return;
    }
    const confirmed = await confirm({
      variant: selectedAttendance ? "update" : "create",
      title: selectedAttendance ? "Update Attendance" : "Record Attendance",
      message: `Are you sure you want to ${selectedAttendance ? "update" : "record"} this attendance?`,
    });
    if (!confirmed) return;
    try {
      if (selectedAttendance) {
        await updateMutation.mutateAsync({ id: selectedAttendance.id, data: formData as UpdateSubjectAttendanceDto });
        showSuccess("Attendance updated successfully!");
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess("Attendance recorded successfully!");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save attendance");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Attendance",
      message: "Are you sure you want to delete this attendance record?",
    });
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Attendance deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete attendance");
      }
    }
  };

  // ─── Bulk modal ────────────────────────────────────────────────────────────
  const handleOpenBulkModal = async () => {
    if (!sessionIdFilter) {
      showError("Please select a Teaching Session filter first.");
      return;
    }
    setIsBulkModalOpen(true);
    setIsLoadingBulk(true);
    setBulkStudents([]);
    setSelectedBulkStudents(new Set());
    setBulkStatuses({});
    setBulkRemarks({});
    setBulkSearch("");
    try {
      const res = await academicService.getClassEnrollments({
        limit: 200,
        classId: urlClassId || undefined,
        status: "active",
      });
      setBulkStudents(res.data as any);
      const allIds = new Set(
        res.data.map((s) => s.user?.public_id).filter(Boolean) as string[]
      );
      setSelectedBulkStudents(allIds);
    } catch (e) {
      showError("Failed to load students for bulk attendance.");
    } finally {
      setIsLoadingBulk(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!sessionIdFilter || selectedBulkStudents.size === 0) return;
    const confirmed = await confirm({
      variant: "create",
      title: "Confirm Bulk Attendance",
      message: `Record attendance for ${selectedBulkStudents.size} students?`,
    });
    if (!confirmed) return;
    try {
      const records = Array.from(selectedBulkStudents).map((studentId) => ({
        studentId,
        status: (bulkStatuses[studentId] || defaultBulkStatus) as CreateSubjectAttendanceDto["status"],
        remarks: bulkRemarks[studentId] || undefined,
      }));
      await bulkMutation.mutateAsync({ teachingSessionId: sessionIdFilter, records });
      showSuccess(`Recorded attendance for ${selectedBulkStudents.size} students.`);
      setIsBulkModalOpen(false);
    } catch (e) {
      showError("Some records failed to save. Please check.");
    }
  };

  // ─── Report ────────────────────────────────────────────────────────────────
  const handleDownloadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportParams.classId || !reportParams.startDate || !reportParams.endDate) {
      showError("Please fill in all required fields");
      return;
    }
    try {
      const blob = await attendanceService.downloadSubjectAttendanceReport({
        classId: Number(reportParams.classId),
        startDate: reportParams.startDate,
        endDate: reportParams.endDate,
        subjectId: reportParams.subjectId ? Number(reportParams.subjectId) : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${reportParams.startDate}-to-${reportParams.endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsReportModalOpen(false);
      showSuccess("Report downloaded successfully");
    } catch (error) {
      showError("Failed to download report");
    }
  };

  const filteredBulkStudents = useMemo(() => {
    if (!bulkSearch) return bulkStudents;
    const q = bulkSearch.toLowerCase();
    return bulkStudents.filter(
      (s) =>
        s.user?.name?.toLowerCase().includes(q) ||
        s.user?.studentProfile?.nis?.toLowerCase().includes(q)
    );
  }, [bulkStudents, bulkSearch]);

  const presentCount = Object.values(bulkStatuses).filter((v) => v === "present" || (!v && defaultBulkStatus === "present")).length;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta
        title="Subject Attendance | Visia"
        description="Record and manage student presence for each teaching session."
      />
      <PageBreadcrumb pageTitle="Subject Attendance" />

      <div className="space-y-6">
        {/* ── Header (Desktop Only) ── */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <CalenderIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Subject Attendance
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Track student attendance for each subject session.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {sessionContext && (
               <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-500/10 rounded-full border border-brand-100 dark:border-brand-500/20">
                 <CalenderIcon className="size-3.5 text-brand-500" />
                 <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                   {sessionContext.sessionDate} · {sessionContext.startTime?.slice(0, 5)}–{sessionContext.endTime?.slice(0, 5)}
                 </span>
                 <span className="text-xs text-brand-400 dark:text-brand-500">
                   {sessionContext.classSubject?.class?.name} · {sessionContext.classSubject?.subject?.name}
                 </span>
               </div>
             )}

            <DataActionsMenu
              onExportPdf={() => {
                const params: any = {};
                if (urlClassId) params.classId = urlClassId;
                setReportParams((p) => ({ ...p, ...params }));
                setIsReportModalOpen(true);
              }}
            />
            {sessionIdFilter && (
              <Button
                variant="outline"
                className="hidden sm:flex"
                startIcon={<GroupIcon className="size-4" />}
                onClick={handleOpenBulkModal}
              >
                Bulk Record
              </Button>
            )}
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
            >
              <PlusIcon className="fill-white size-4" /> Record Attendance
            </button>
          </div>
        </div>

        {/* ── Mobile FAB ── */}
        {isMobile && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
            <DataActionsMenu
              isMobileFab={true}
              onExportPdf={() => {
                const params: any = {};
                if (urlClassId) params.classId = urlClassId;
                setReportParams((p) => ({ ...p, ...params }));
                setIsReportModalOpen(true);
              }}
            />
            {sessionIdFilter && (
              <button
                onClick={handleOpenBulkModal}
                className="flex size-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg border border-gray-100 transition-transform active:scale-95"
              >
                <GroupIcon className="size-5" />
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

        {/* ── Stats Bar ── */}
        {attendances.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <StatPill
              label="Present"
              value={stats.present}
              total={stats.total}
              colorClass="text-emerald-600 dark:text-emerald-400"
              bgClass="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20"
            />
            <StatPill
              label="Late"
              value={stats.late}
              total={stats.total}
              colorClass="text-orange-600 dark:text-orange-400"
              bgClass="bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20"
            />
            <StatPill
              label="Absent"
              value={stats.absent}
              total={stats.total}
              colorClass="text-red-600 dark:text-red-400"
              bgClass="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20"
            />
            <StatPill
              label="Excused / Sick"
              value={stats.excused}
              total={stats.total}
              colorClass="text-blue-600 dark:text-blue-400"
              bgClass="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20"
            />
            <div className="flex-1 min-w-[100px] rounded-xl p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
              <div className="text-2xl font-extrabold leading-none tabular-nums text-gray-800 dark:text-white">
                {stats.total}
              </div>
              <div className="text-xs font-semibold text-gray-400 mt-1">Total Recorded</div>
              <div className="mt-2 text-[10px] font-bold text-gray-400">
                {total > stats.total ? `of ${total} in DB` : "this page"}
              </div>
            </div>
          </div>
        )}

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
                          Search & Filter
                      </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                      Use the criteria below to filter records based on status, student, or session.
                  </p>
              </div>
              <div className="shrink-0 ml-4">
                  <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
              </div>
          </button>
          
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                  isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}>
              <div className="overflow-hidden min-h-0">
                  <div className="px-5 pb-5">
                      <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                      
                      <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Academic Year</Label>
                            <CustomSelect
                                value={academicYearIdFilter}
                                onChange={(val) => { setAcademicYearIdFilter(String(val)); setPage(1); }}
                                onClear={() => { setAcademicYearIdFilter(""); setPage(1); }}
                                placeholder="All Academic Years"
                                options={[{ label: "All Academic Years", value: "" }, ...academicYearOptions]}
                                className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Class</Label>
                            <CustomSelect
                                value={classIdFilter}
                                onChange={(val) => { setClassIdFilter(String(val)); setPage(1); }}
                                onClear={() => { setClassIdFilter(""); setPage(1); }}
                                placeholder="All Classes"
                                options={[{ label: "All Classes", value: "" }, ...uniqueClasses]}
                                className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Subject</Label>
                            <CustomSelect
                                value={subjectIdFilter}
                                onChange={(val) => { setSubjectIdFilter(String(val)); setPage(1); }}
                                onClear={() => { setSubjectIdFilter(""); setPage(1); }}
                                placeholder="All Subjects"
                                options={[{ label: "All Subjects", value: "" }, ...uniqueSubjects]}
                                className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                            />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                              <CustomSelect
                                  value={statusFilter === "all" ? "" : statusFilter}
                                  onChange={(val) => { setStatusFilter(val ? String(val) : "all"); setPage(1); }}
                                  onClear={() => { setStatusFilter("all"); setPage(1); }}
                                  placeholder="All Status"
                                  options={[
                                    { label: "Present", value: "present" },
                                    { label: "Absent", value: "absent" },
                                    { label: "Late", value: "late" },
                                    { label: "Excused", value: "excused" },
                                    { label: "Sick", value: "sick" }
                                  ]}
                                  className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                              />
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Student</Label>
                            <SearchableAsyncSelect
                              placeholder="Search…"
                              value={studentIdFilter}
                              onChange={(val) => { setStudentIdFilter(String(val)); setPage(1); }}
                              onSearch={searchStudents}
                              options={[{ label: "All Students", value: "" }, ...studentOptions]}
                              isLoading={isSearchingStudents}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Date From</Label>
                            <VisiaDatePicker
                              value={dateFrom}
                              onChange={(d) => { setDateFrom(d); setPage(1); }}
                              placeholder="Start date"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Date To</Label>
                            <VisiaDatePicker
                              value={dateTo}
                              onChange={(d) => { setDateTo(d); setPage(1); }}
                              placeholder="End date"
                            />
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-5 items-end md:grid-cols-3">
                          <div className="md:col-span-2 space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Search</Label>
                              <div className="relative">
                                  <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                  <input
                                      type="text"
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setAppliedSearch(searchQuery);
                                          setPage(1);
                                          if (isMobile) setIsFilterOpen(false);
                                        }
                                      }}
                                      placeholder="Search by student name..."
                                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                                  />
                              </div>
                          </div>
                          <div className="flex items-center gap-3 md:col-span-1">
                              <button 
                                onClick={() => {
                                  setAcademicYearIdFilter("");
                                  setClassIdFilter("");
                                  setSubjectIdFilter("");
                                  setSessionIdFilter("");
                                  setStudentIdFilter("");
                                  setStatusFilter("");
                                  setDateFrom("");
                                  setDateTo("");
                                  setSearchQuery("");
                                  setAppliedSearch("");
                                  setSearchParams({});
                                  setPage(1);
                                }} 
                                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300"
                              >
                                  Reset
                              </button>
                              <button 
                                onClick={() => {
                                  setAppliedSearch(searchQuery);
                                  setPage(1);
                                  if (isMobile) setIsFilterOpen(false);
                                }} 
                                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 active:scale-[.98]"
                              >
                                  Search
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        {/* ── Content: Mobile Grid vs Desktop Table ── */}
        {isMobile ? (
          <div className="space-y-3">
            {/* Select All bar */}
            {attendances.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={selectedRowIds.size === attendances.length} onChange={toggleAllRows} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedRowIds.size > 0 ? `${selectedRowIds.size} selected` : "Select all"}
                </span>
              </div>
            )}

            {/* Mobile Cards */}
            {isLoading && !infiniteData ? (
              <div className="py-12 flex justify-center"><div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
            ) : infiniteData?.pages.flatMap(p => p.data).length === 0 ? (
              <div className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="size-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <CheckCircleIcon className="size-6 opacity-30" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No records found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sessionIdFilter ? "No attendance recorded for this session yet." : "Select a session or adjust filters."}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenModal()}
                    className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
                  >
                    <PlusIcon className="size-3.5" />
                    Record First Attendance
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {infiniteData?.pages.flatMap(p => p.data).map((record: SubjectAttendance) => (
                  <SubjectAttendanceCard
                    key={record.id}
                    attendance={record}
                    isSelected={selectedRowIds.has(record.id)}
                    onToggle={() => toggleRowSelection(record.id)}
                    onEdit={() => handleOpenModal(record)}
                    onDelete={() => handleDelete(record.id)}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-4 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!hasNextPage && (infiniteData?.pages.flatMap(p => p.data).length || 0) > 0 && (
                <p className="text-xs text-gray-400">All records loaded</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]
              [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
              <Table className="min-w-full">
                <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                  <TableRow>
                    <TableCell isHeader className="w-10 px-4 py-3.5">
                      <Checkbox checked={selectedRowIds.size === attendances.length && attendances.length > 0} onChange={toggleAllRows} />
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-left w-[15%]">
                      <button onClick={() => handleSort("session")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                        Session <SortIcon column="session" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-left w-[25%]">
                      <button onClick={() => handleSort("student")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                        User <SortIcon column="student" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-center w-[15%]">
                      <button onClick={() => handleSort("status")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider mx-auto">
                        Status <SortIcon column="status" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell w-[25%]">
                      Subject
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="size-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                          <span className="text-sm">Loading attendance records…</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAndSorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="size-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                            <CheckCircleIcon className="size-6 opacity-30" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No records found</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {sessionIdFilter ? "No attendance recorded for this session yet." : "Select a session or adjust filters."}
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenModal()}
                            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
                          >
                            <PlusIcon className="size-3.5" />
                            Record First Attendance
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSorted.map((record: SubjectAttendance) => (
                      <TableRow
                        key={record.id}
                        className={`group transition-colors ${
                          selectedRowIds.has(record.id)
                            ? "bg-brand-50/60 dark:bg-brand-500/5"
                            : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                        }`}
                      >
                        <TableCell className="w-10 px-4 py-4">
                          <Checkbox checked={selectedRowIds.has(record.id)} onChange={() => toggleRowSelection(record.id)} />
                        </TableCell>
                        {/* Session */}
                        <TableCell className="px-4 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium text-theme-sm">
                              <CalenderIcon className="size-3.5 text-brand-400 shrink-0" />
                              {record.teachingSession?.sessionDate || "—"}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <TimeIcon className="size-3.5 opacity-50 shrink-0" />
                              {record.teachingSession?.startTime?.slice(0, 5)}–{record.teachingSession?.endTime?.slice(0, 5)}
                              {record.teachingSession?.id && sessionOrderMap.has(record.teachingSession.id) && (
                                <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md font-bold ml-1 dark:bg-brand-500/10 dark:text-brand-400">
                                  Sesi ke-{sessionOrderMap.get(record.teachingSession.id)}
                                </span>
                              )}
                            </div>
                            {record.teachingSession?.notes && (
                              <div className="text-[11px] text-gray-400 italic max-w-[200px] truncate">
                                "{record.teachingSession.notes}"
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Student */}
                        <TableCell className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0">
                              {record.student?.photo ? (
                                <img src={record.student.photo} alt={record.student.name} className="size-full object-cover" />
                              ) : (
                                <UserIcon className="size-4 text-gray-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white text-theme-sm leading-tight truncate max-w-[150px]">
                                {record.student?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]">
                                {(() => {
                                  const user = record.student as any;
                                  if (!user) return "—";
                                  const isStudent = user.roles?.some((r: any) => r.name?.toLowerCase() === 'student' || r.name?.toLowerCase() === 'siswa');
                                  const nis = user.studentProfile?.nis || user.profile?.nis || user.studentProfile?.nisn || user.profile?.nisn;
                                  const eid = user.employeeProfile?.employeeId || user.profile?.employeeId || user.employeeProfile?.nip || user.profile?.nip;
                                  
                                  if (isStudent && nis) return `NIS: ${nis}`;
                                  if (!isStudent && eid) return `EID: ${eid}`;
                                  if (nis) return `NIS: ${nis}`;
                                  if (eid) return `EID: ${eid}`;
                                  return "—";
                                })()}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status — inline clickable */}
                        <TableCell className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <InlineStatusBadge
                              status={record.status}
                              loading={cyclingId === record.id}
                              onCycle={() => handleCycleStatus(record)}
                            />
                            {record.recordedAt || record.updatedAt || record.createdAt ? (
                              <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                                <TimeIcon className="size-3 opacity-70" />
                                {new Date(record.updatedAt || record.recordedAt || record.createdAt || '').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 mt-0.5 hidden group-hover:block">
                                Click to change
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Subject */}
                        <TableCell className="px-4 py-4 hidden lg:table-cell">
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {record.teachingSession?.classSubject?.subject?.name || "—"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {record.teachingSession?.classSubject?.class?.name}
                            </p>
                          </div>
                        </TableCell>

                        {/* Actions (Dropdown) */}
                        <TableCell className="px-4 py-4 text-center w-16">
                          <RowActionMenu
                            onEdit={() => handleOpenModal(record)}
                            onDelete={() => handleDelete(record.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* ── Pagination ── */}
              {!isLoading && total > 0 && (
                <div className="border-t border-gray-100 dark:border-white/[0.05] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                    <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                    <span className="font-medium text-gray-700 dark:text-white">{total}</span> records
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                    >
                      <ChevronLeftIcon className="size-4" /> Previous
                    </button>
                    <div className="flex items-center justify-center min-w-[3rem] text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {page} / {totalPages || 1}
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || totalPages === 0}
                      className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                    >
                      Next <AngleRightIcon className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}


      </div>

      {/* ═══════════════════════════════════════════════════════════
          Single Record Modal
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-xl"
        title={selectedAttendance ? "Update Attendance" : "Record Attendance"}
        description="Manually record or update a student's attendance for a session."
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">
              Cancel
            </button>
            <button type="submit" form="subject-attendance-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20">
              {selectedAttendance ? "Update Record" : "Save Record"}
            </button>
          </div>
        }
      >
        <form id="subject-attendance-form" onSubmit={handleSubmit} className="space-y-4">
          <SearchableAsyncSelect
            label="Teaching Session"
            placeholder="Search by date (YYYY-MM-DD)…"
            value={formData.teachingSessionId}
            onChange={(val) => setFormData({ ...formData, teachingSessionId: String(val) })}
            onSearch={useCallback(async (term: string) => {
              setIsSearchingSessions(true);
              try {
                const res = await attendanceService.getTeachingSessions({
                  sessionDate: term,
                  limit: 10,
                  actualTeacherId: !isGlobalView ? (user?.public_id || String(user?.id)) : undefined
                });
                setSessionOptions(
                  res.data.map((s: TeachingSession) => ({
                    label: `${s.sessionDate} (${s.startTime?.slice(0, 5)})`,
                    value: String(s.id),
                    subLabel: `${s.classSubject?.class?.name} · ${s.classSubject?.subject?.name}`,
                  }))
                );
              } catch (e) {
                console.error(e);
              } finally {
                setIsSearchingSessions(false);
              }
            }, [])}
            options={sessionOptions}
            isLoading={isSearchingSessions}
          />

          <SearchableAsyncSelect
            label="Student"
            placeholder="Search student…"
            value={formData.studentId}
            onChange={(val) => setFormData({ ...formData, studentId: String(val) })}
            onSearch={searchStudents}
            options={studentOptions}
            isLoading={isSearchingStudents}
          />

          {/* Status quick-select chips */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_CYCLE.map((s) => {
                const m = statusMeta[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: s })}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                      formData.status === s
                        ? `${m.bg} ${m.text} border-current scale-105 shadow-sm`
                        : "bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <textarea
              value={formData.remarks || ""}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Reason, notes, etc…"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none h-20"
            />
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          Report Modal
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        className="max-w-md"
        title="Download Attendance Report"
        description="Generate and download a subject attendance PDF report."
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsReportModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">
              Cancel
            </button>
            <button type="submit" form="report-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20">
              Download PDF
            </button>
          </div>
        }
      >
        <form id="report-form" onSubmit={handleDownloadReport} className="space-y-4">
          <CustomSelect
            label="Class"
            placeholder="Select Class…"
            value={reportParams.classId}
            onChange={(val) => setReportParams({ ...reportParams, classId: String(val) })}
            options={classOptions}
          />
          <CustomSelect
            label="Subject"
            placeholder={reportParams.classId ? "All Subjects" : "Select Class first…"}
            value={reportParams.subjectId}
            onChange={(val) => setReportParams({ ...reportParams, subjectId: String(val) })}
            options={[{ label: "All Subjects", value: "" }, ...reportSubjectOptions]}
            disabled={!reportParams.classId}
          />
          <div className="grid grid-cols-2 gap-4">
            <VisiaDatePicker
              label="Start Date"
              value={reportParams.startDate}
              onChange={(val: string) => setReportParams({ ...reportParams, startDate: val })}
              required
            />
            <VisiaDatePicker
              label="End Date"
              value={reportParams.endDate}
              onChange={(val: string) => setReportParams({ ...reportParams, endDate: val })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          Bulk Record Modal
      ════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        className="max-w-4xl"
        title="Bulk Record Attendance"
        description="Record attendance for all students in this class at once."
        subHeader={
          <div className="flex flex-col gap-3 px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
            {/* Stats row */}
            {bulkStudents.length > 0 && (
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-gray-600 dark:text-gray-300">
                  {selectedBulkStudents.size} / {bulkStudents.length} selected
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {Array.from(selectedBulkStudents).filter((id) => (bulkStatuses[id] || defaultBulkStatus) === "present").length} Present
                </span>
                <span className="text-orange-500 font-semibold">
                  {Array.from(selectedBulkStudents).filter((id) => (bulkStatuses[id] || defaultBulkStatus) === "late").length} Late
                </span>
                <span className="text-red-500 font-semibold">
                  {Array.from(selectedBulkStudents).filter((id) => (bulkStatuses[id] || defaultBulkStatus) === "absent").length} Absent
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  label="Select All"
                  checked={bulkStudents.length > 0 && selectedBulkStudents.size === bulkStudents.length}
                  onChange={(c) => {
                    if (c) setSelectedBulkStudents(new Set(bulkStudents.map((s) => s.user?.public_id).filter(Boolean) as string[]));
                    else setSelectedBulkStudents(new Set());
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                {/* Bulk search */}
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter students…"
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    className="h-8 pl-8 pr-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none focus:border-brand-500 dark:text-white w-40"
                  />
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">Set all to:</span>
                <div className="relative">
                  <select
                    value={defaultBulkStatus}
                    onChange={(e) => {
                      setDefaultBulkStatus(e.target.value);
                      const newStatuses = { ...bulkStatuses };
                      selectedBulkStudents.forEach((id) => { newStatuses[id] = e.target.value; });
                      setBulkStatuses(newStatuses);
                    }}
                    className="h-8 w-32 appearance-none rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.05] dark:text-white px-3 text-sm outline-none focus:border-brand-500"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">
              {selectedBulkStudents.size} students will be recorded
            </span>
            <div className="flex gap-3">
              <button onClick={() => setIsBulkModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={selectedBulkStudents.size === 0 || bulkMutation.isPending}
                className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {bulkMutation.isPending && <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save {selectedBulkStudents.size} Records
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-0">
          {isLoadingBulk ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredBulkStudents.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-500">
              {bulkStudents.length === 0 ? "No students found for this class." : "No students match your search."}
            </p>
          ) : (
            <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-10" />
                    <th className="p-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="p-3 font-semibold text-xs text-gray-500 uppercase tracking-wider w-36">Status</th>
                    <th className="p-3 font-semibold text-xs text-gray-500 uppercase tracking-wider hidden md:table-cell">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredBulkStudents.map((student) => {
                    const sid = student.user?.public_id;
                    if (!sid) return null;
                    const isSelected = selectedBulkStudents.has(sid);
                    const currentStatus = bulkStatuses[sid] || defaultBulkStatus;
                    const meta = statusMeta[currentStatus] || statusMeta["present"];
                    return (
                      <tr
                        key={sid}
                        className={`transition-colors ${isSelected ? "bg-brand-50/30 dark:bg-brand-500/5" : "opacity-50 hover:opacity-70"}`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={(c) => {
                              const next = new Set(selectedBulkStudents);
                              if (c) next.add(sid);
                              else next.delete(sid);
                              setSelectedBulkStudents(next);
                            }}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden shrink-0 border border-white dark:border-gray-700">
                              {student.user?.photo ? (
                                <img src={student.user.photo} alt={student.user.name} className="size-full object-cover" />
                              ) : (
                                <div className="flex size-full items-center justify-center text-gray-400">
                                  <UserIcon className="size-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{student.user?.name}</p>
                              <p className="text-xs text-gray-400 font-medium">{student.user?.studentProfile?.nis || student.studentId || student.nis}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="relative w-32">
                            <select
                              value={currentStatus}
                              onChange={(e) => setBulkStatuses((prev) => ({ ...prev, [sid]: e.target.value }))}
                              disabled={!isSelected}
                              className={`h-8 w-full appearance-none rounded-lg border px-2.5 text-xs font-bold outline-none transition-all ${meta.bg} ${meta.text} border-transparent focus:border-current`}
                            >
                              {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 opacity-50" />
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <input
                            type="text"
                            placeholder="Optional note…"
                            value={bulkRemarks[sid] || ""}
                            onChange={(e) => setBulkRemarks((prev) => ({ ...prev, [sid]: e.target.value }))}
                            disabled={!isSelected}
                            className="h-8 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-2.5 text-xs outline-none focus:border-brand-500 dark:text-white disabled:opacity-40 placeholder:text-gray-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default SubjectAttendances;
