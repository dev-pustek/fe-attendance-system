import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useSubjectAttendances, useAttendanceStatuses } from "../../../api/hooks/useAttendance";
import { useClasses } from "../../../api/hooks/useAcademic";
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
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Label from "../../../components/atoms/Label";

const SubjectAttendances: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSessionId = searchParams.get("teachingSessionId");
  const urlClassId = searchParams.get("classId");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sessionIdFilter, setSessionIdFilter] = useState(urlSessionId || "");
  const [studentIdFilter, setStudentIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (urlSessionId) setSessionIdFilter(urlSessionId);
  }, [urlSessionId]);

  const { confirm, confirmState } = useConfirm();

  const {
    data: response,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useSubjectAttendances({
    teachingSessionId: sessionIdFilter || undefined,
    studentId: studentIdFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit,
  });

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] =
    useState<SubjectAttendance | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Bulk Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStudents, setBulkStudents] = useState<StudentProfile[]>([]);
  const [isLoadingBulk, setIsLoadingBulk] = useState(false);
  const [selectedBulkStudents, setSelectedBulkStudents] = useState<Set<string>>(
    new Set(),
  );
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, string>>({});
  const [defaultBulkStatus, setDefaultBulkStatus] = useState("present");

  const [formData, setFormData] = useState<CreateSubjectAttendanceDto>({
    teachingSessionId: "",
    studentId: "",
    status: "present",
    remarks: "",
  });

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportParams, setReportParams] = useState({
    classId: "",
    subjectId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [reportSubjectOptions, setReportSubjectOptions] = useState<
    { label: string; value: string }[]
  >([]);

  // Fetch subjects when class changes in report modal
  useEffect(() => {
    if (reportParams.classId) {
      academicService
        .getClassSubjects({ classId: reportParams.classId })
        .then((res) => {
          setReportSubjectOptions(
            res.data.map((cs) => ({
              label: cs.subject?.name || "Unknown",
              value: String(cs.subjectId),
            })),
          );
        })
        .catch((err) => {
          console.error("Failed to fetch subjects for report", err);
        });
    } else {
      setReportSubjectOptions([]);
    }
  }, [reportParams.classId]);

  const { data: classesRes } = useClasses({ limit: 100 });

  const classOptions = (classesRes?.data || []).map((c) => ({
    label: c.name,
    value: String(c.id),
  }));

  // --- Student Search ---
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [studentOptions, setStudentOptions] = useState<
    { label: string; value: string; subLabel?: string }[]
  >([]);

  const searchStudents = useCallback(async (term: string) => {
    setIsSearchingStudents(true);
    try {
      const students = await profilesService.getStudents({
        search: term,
        limit: 10,
      });
      setStudentOptions(
        students.data.map((s) => ({
          label: s.user?.name || "Unknown",
          value: s.user?.public_id || "",
          subLabel: s.user?.studentProfile?.nis || s.studentId || s.nis || "",
        })),
      );
    } catch (error) {
      console.error("Failed to search students", error);
    } finally {
      setIsSearchingStudents(false);
    }
  }, []);

  const [isSearchingSessions, setIsSearchingSessions] = useState(false);
  const [sessionOptions, setSessionOptions] = useState<
    { label: string; value: string; subLabel?: string }[]
  >([]);

  // Initialize session options if filter is present
  useEffect(() => {
    if (urlSessionId) {
      attendanceService
        .getTeachingSessions({ limit: 1 })
        .then(() => {
          // Intentionally empty or simple fetch to ensure data flow
        })
        .catch(() => {});
    }
  }, [urlSessionId]);

  // Re-declare handleSort
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const attendances = useMemo(() => {
    return response?.data || [];
  }, [response]);

  const sortedAttendances = useMemo(() => {
    if (!sortConfig) return attendances;
    return [...attendances].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number = "";
      let valB: string | number = "";

      if (key === "student") {
        valA = a.student?.name || "";
        valB = b.student?.name || "";
      } else if (key === "session") {
        valA = a.teachingSession?.sessionDate || "";
        valB = b.teachingSession?.sessionDate || "";
      } else {
        valA = String((a as unknown as Record<string, unknown>)[key] ?? "");
        valB = String((b as unknown as Record<string, unknown>)[key] ?? "");
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [attendances, sortConfig]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column)
      return (
        <div className="size-3 opacity-20">
          <ChevronUpIcon />
        </div>
      );
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = response?.meta?.itemCount || 0;
  const totalPages = response?.meta?.pageCount || 1;

  const handleOpenModal = (record?: SubjectAttendance) => {
    if (record) {
      setSelectedAttendance(record);
      setFormData({
        teachingSessionId: record.teachingSessionId,
        studentId: record.studentId,
        status: record.status,
        remarks: record.remarks || "",
      });
      // Pre-populate options
      if (record.student) {
        setStudentOptions([
          {
            label: record.student.name || "Unknown",
            value: record.student.public_id || "",
            subLabel: record.student.email,
          },
        ]);
      }
      if (record.teachingSession) {
        const s = record.teachingSession;
        setSessionOptions([
          {
            label: `${s.sessionDate} (${s.startTime})`,
            value: String(s.id),
            subLabel: s.classSubject?.subject?.name,
          },
        ]);
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

  // Bulk Modal Logic
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

    try {
      const classIdToFetch = urlClassId; // Try URL param

      if (!classIdToFetch) {
        // If no classId, we might not fetch correct students.
        showError("Warning: Class ID not found. Displaying all students.");
      }

      // Fetch students via Class Enrollments for accurate class list
      const res = await academicService.getClassEnrollments({
        limit: 100,
        classId: classIdToFetch || undefined,
        status: "active",
      });
      setBulkStudents(res.data as any);

      // Default select all
      const allIds = new Set(
        res.data.map((s) => s.user?.public_id).filter(Boolean) as string[],
      );
      setSelectedBulkStudents(allIds);
    } catch (e) {
      console.error(e);
      showError("Failed to load students for bulk attendance.");
    } finally {
      setIsLoadingBulk(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!sessionIdFilter) return;

    const confirmed = await confirm({
      variant: "create",
      title: "Confirm Bulk Attendance",
      message: `You are about to record attendance for ${selectedBulkStudents.size} students. Continue?`,
    });

    if (!confirmed) return;

    try {
      const promises = Array.from(selectedBulkStudents).map((studentId) => {
        return createMutation.mutateAsync({
          teachingSessionId: sessionIdFilter,
          studentId,
          status: (bulkStatuses[studentId] || defaultBulkStatus) as any,
        });
      });

      await Promise.all(promises);
      showSuccess(
        `Successfully recorded attendance for ${selectedBulkStudents.size} students.`,
      );
      setIsBulkModalOpen(false);
    } catch (e) {
      console.error(e);
      showError("Some records failed to save. Please check the list.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.teachingSessionId ||
      !formData.studentId ||
      !formData.status
    ) {
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
        await updateMutation.mutateAsync({
          id: selectedAttendance.id,
          data: formData as UpdateSubjectAttendanceDto,
        });
        showSuccess(`Attendance updated successfully!`);
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess(`Attendance recorded successfully!`);
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

  const handleDownloadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !reportParams.classId ||
      !reportParams.startDate ||
      !reportParams.endDate
    ) {
      showError("Please fill in all required fields");
      return;
    }

    try {
      const blob = await attendanceService.downloadSubjectAttendanceReport({
        classId: Number(reportParams.classId),
        startDate: reportParams.startDate,
        endDate: reportParams.endDate,
        subjectId: reportParams.subjectId
          ? Number(reportParams.subjectId)
          : undefined,
      });

      // Create download link
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
      console.error(error);
      showError("Failed to download report");
    }
  };

  return (
    <>
      <PageMeta
        title="Subject Attendance | Visia"
        description="Record student presence for specific teaching sessions."
      />
      <PageBreadcrumb pageTitle="Subject Attendance" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Subject Attendance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track student attendance for each subject session.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {sessionIdFilter && (
              <button
                onClick={handleOpenBulkModal}
                className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.05]"
              >
                <GroupIcon className="size-4 fill-current" />
                Bulk Record
              </button>
            )}
            <button
              onClick={() => {
                // Pre-fill classId if available from URL
                if (urlClassId) {
                  setReportParams((prev) => ({ ...prev, classId: urlClassId }));
                }
                setIsReportModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.05]"
            >
              <DownloadIcon className="size-4 fill-current" />
              Download Report
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              <PlusIcon className="size-4 fill-current" />
              Record Attendance
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-100 dark:border-white/[0.05]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <SearchableAsyncSelect
              label="Student Filter"
              placeholder="Search student..."
              value={studentIdFilter}
              onChange={(val) => {
                setStudentIdFilter(String(val));
                setPage(1);
              }}
              onSearch={searchStudents}
              options={[
                { label: "All Students", value: "" },
                ...studentOptions,
              ]}
              isLoading={isSearchingStudents}
            />

            <CustomSelect
              label="Status"
              value={statusFilter}
              onChange={(val: string | number) => {
                setStatusFilter(String(val));
                setPage(1);
              }}
              options={[
                { label: "All Status", value: "" },
                ...statusOptions,
              ]}
            />

            <div className="space-y-1.5 hidden md:block">
              <Label>Session ID</Label>
              <input
                type="text"
                value={sessionIdFilter || "All"}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 cursor-not-allowed"
                placeholder="Filtered from Teaching Sessions"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSessionIdFilter("");
                  setStudentIdFilter("");
                  setStatusFilter("");
                  setSearchParams({});
                  setPage(1);
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <CloseIcon className="size-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button
                    onClick={() => handleSort("session")}
                    className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider"
                  >
                    Session <SortIcon column={"session"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button
                    onClick={() => handleSort("student")}
                    className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider"
                  >
                    Student <SortIcon column={"student"} />
                  </button>
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left"
                >
                  Remarks
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading attendance...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedAttendances.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <CheckCircleIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No records found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAttendances.map((record: SubjectAttendance) => (
                  <TableRow
                    key={record.id}
                    className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <TableCell className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium text-theme-sm">
                          <CalenderIcon className="size-3.5 opacity-50" />
                          {record.teachingSession?.sessionDate}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <TimeIcon className="size-3.5 opacity-50" />
                          {record.teachingSession?.startTime.substring(
                            0,
                            5,
                          )} - {record.teachingSession?.endTime.substring(0, 5)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                          {record.student?.photo ? (
                            <img
                              src={record.student.photo}
                              alt={record.student.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <UserIcon className="size-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">
                            {record.student?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {record.student?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge
                        color={
                          record.status === "present"
                            ? "success"
                            : record.status === "absent"
                              ? "error"
                              : record.status === "late"
                                ? "warning"
                                : record.status === "sick"
                                  ? "primary"
                                  : "info"
                        }
                      >
                        {record.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <p
                        className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]"
                        title={record.remarks || ""}
                      >
                        {record.remarks || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(record)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
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

        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-white">
                {(page - 1) * limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-gray-700 dark:text-white">
                {Math.min(page * limit, total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700 dark:text-white">
                {total}
              </span>{" "}
              records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <ChevronLeftIcon className="size-4" />
                Previous
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {page}
                </span>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {totalPages || 1}
                </span>
              </div>

              <button
                onClick={() =>
                  setPage((p: number) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages || totalPages === 0}
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
        className="max-w-xl"
        title={selectedAttendance ? "Update Attendance" : "Record Attendance"}
        description="Manually record or update a student's attendance status for a session."
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="subject-attendance-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedAttendance ? "Update Record" : "Save Record"}
            </button>
          </div>
        }
      >
        <form
          id="subject-attendance-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <SearchableAsyncSelect
            label="Teaching Session"
            placeholder="Search by date (YYYY-MM-DD)..."
            value={formData.teachingSessionId}
            onChange={(val) =>
              setFormData({ ...formData, teachingSessionId: String(val) })
            }
            onSearch={useCallback(async (term: string) => {
              try {
                setIsSearchingSessions(true);
                const res = await attendanceService.getTeachingSessions({
                  sessionDate: term,
                  limit: 10,
                });
                setSessionOptions(
                  res.data.map((s: TeachingSession) => ({
                    label: `${s.sessionDate} (${s.startTime})`,
                    value: String(s.id),
                    subLabel: `${s.classSubject?.class?.name} - ${s.classSubject?.subject?.name}`,
                  })),
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
            placeholder="Search student..."
            value={formData.studentId}
            onChange={(val) =>
              setFormData({ ...formData, studentId: String(val) })
            }
            onSearch={searchStudents}
            options={studentOptions}
            isLoading={isSearchingStudents}
          />

          <CustomSelect
            label="Status"
            placeholder="Select status..."
            value={formData.status}
            onChange={(val) =>
              setFormData({
                ...formData,
                status: String(val) as SubjectAttendance["status"],
              })
            }
            options={statusOptions}
          />

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <textarea
              value={formData.remarks || ""}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              placeholder="Reason, notes, etc..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none h-24"
            />
          </div>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        className="max-w-md"
        title="Download Attendance Report"
        description="Generate and download attendance report PDF."
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="report-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              Download PDF
            </button>
          </div>
        }
      >
        <form
          id="report-form"
          onSubmit={handleDownloadReport}
          className="space-y-4"
        >
          <CustomSelect
            label="Class"
            placeholder="Select Class..."
            value={reportParams.classId}
            onChange={(val) =>
              setReportParams({ ...reportParams, classId: String(val) })
            }
            options={classOptions}
          />
          <CustomSelect
            label="Subject"
            placeholder={
              reportParams.classId
                ? "All Subjects"
                : "Select Class first..."
            }
            value={reportParams.subjectId}
            onChange={(val) =>
              setReportParams({ ...reportParams, subjectId: String(val) })
            }
            options={[
              { label: "All Subjects", value: "" },
              ...reportSubjectOptions,
            ]}
            disabled={!reportParams.classId}
          />
          <div className="grid grid-cols-2 gap-4">
            <VisiaDatePicker
              label="Start Date"
              value={reportParams.startDate}
              onChange={(val: string) =>
                setReportParams({ ...reportParams, startDate: val })
              }
              required
            />
            <VisiaDatePicker
              label="End Date"
              value={reportParams.endDate}
              onChange={(val: string) =>
                setReportParams({ ...reportParams, endDate: val })
              }
              required
            />
          </div>
        </form>
      </Modal>

      {/* Bulk Record Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        className="max-w-4xl"
        title="Bulk Record Attendance"
        description="Record attendance for multiple students from the Class."
        subHeader={
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <Checkbox
                label="Select All"
                checked={
                  bulkStudents.length > 0 &&
                  selectedBulkStudents.size === bulkStudents.length
                }
                onChange={(c) => {
                  if (c)
                    setSelectedBulkStudents(
                      new Set(
                        bulkStudents
                          .map((s) => s.user?.public_id)
                          .filter(Boolean) as string[],
                      ),
                    );
                  else setSelectedBulkStudents(new Set());
                }}
              />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {selectedBulkStudents.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 whitespace-nowrap">
                Set All To:
              </span>
              <div className="relative">
                <select
                  value={defaultBulkStatus}
                  onChange={(e) => {
                    setDefaultBulkStatus(e.target.value);
                    const newStatuses = { ...bulkStatuses };
                    selectedBulkStudents.forEach((id) => {
                      newStatuses[id] = e.target.value;
                    });
                    setBulkStatuses(newStatuses);
                  }}
                  className="h-9 w-40 appearance-none rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-white"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <ChevronDownIcon className="size-3.5" />
                </div>
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkSubmit}
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              Save Bulk Records
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-white dark:bg-transparent rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
            {isLoadingBulk ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin size-8 border-2 border-brand-500 border-t-transparent rounded-full"></div>
              </div>
            ) : bulkStudents.length === 0 ? (
              <p className="text-center py-12 text-gray-500">
                No students found for this class.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 font-medium text-gray-500">Select</th>
                    <th className="p-4 font-medium text-gray-500">
                      Student Info
                    </th>
                    <th className="p-4 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {bulkStudents.map((student) => {
                    const sid = student.user?.public_id;
                    if (!sid) return null;
                    const isSelected = selectedBulkStudents.has(sid);
                    return (
                      <tr
                        key={sid}
                        className={`transition-colors ${isSelected ? "bg-brand-50/30 dark:bg-brand-500/5" : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"}`}
                      >
                        <td className="p-4">
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
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-12 rounded bg-gray-100 dark:bg-white/10 overflow-hidden shrink-0 border border-gray-100 dark:border-white/10">
                              {student.user?.photo ? (
                                <img
                                  src={student.user.photo}
                                  alt={student.user.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center text-gray-400">
                                  <UserIcon className="size-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-gray-900 dark:text-white leading-tight">
                                {student.user?.name}
                              </span>
                              <span className="text-xs text-gray-400 font-medium">
                                {student.user?.studentProfile?.nis ||
                                  student.studentId ||
                                  student.nis}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="relative w-32">
                            <select
                              value={bulkStatuses[sid] || defaultBulkStatus}
                              onChange={(e) =>
                                setBulkStatuses((prev) => ({
                                  ...prev,
                                  [sid]: e.target.value,
                                }))
                              }
                              className={`h-9 w-full appearance-none rounded-lg border bg-white px-3 py-1 text-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:bg-white/[0.05] dark:text-white ${
                                isSelected
                                  ? "border-brand-300 dark:border-brand-500/30"
                                  : "border-gray-200 dark:border-white/10"
                              }`}
                              disabled={!isSelected}
                            >
                              {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                              <ChevronDownIcon className="size-3.5" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default SubjectAttendances;
