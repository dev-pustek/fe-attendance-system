import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTeachingSessions } from "../../../api/hooks/useAttendance";
import { useClassSubjects } from "../../../api/hooks/useAcademic";
import {
  TeachingSession,
  CreateTeachingSessionDto,
  UpdateTeachingSessionDto
} from "../../../api/types/attendance";
import { profilesService } from "../../../api/services/profilesService";
import { useAuthStore } from "../../../store/authStore";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import DatePicker from "../../../components/molecules/DatePicker";
import { 
  PencilIcon, 
  TrashBinIcon, 
  PlusIcon, 
  ChevronLeftIcon, 
  AngleRightIcon, 
  BoxIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  UserIcon,
  CalenderIcon,
  TimeIcon,
  GridIcon,
  CloseIcon,
  UserCircleIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import Label from "../../../components/atoms/Label";
import NumberInput from "../../../components/molecules/NumberInput";

const TeachingSessions: React.FC = () => {
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

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [classSubjectIdFilter, setClassSubjectIdFilter] = useState("");
  const [teacherIdFilter, setTeacherIdFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [cancelledFilter, setCancelledFilter] = useState("");
  
  const navigate = useNavigate();
  const { confirm, confirmState } = useConfirm();

  const handleViewAttendance = (session: TeachingSession) => {
    // Try to get class Id from nested object or direct property
    const classId = session.classSubject?.class?.id || session.classSubject?.classId;
    navigate(`/attendance/subject-attendances?teachingSessionId=${session.id}&classId=${classId}`);
  };

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useTeachingSessions({
    classSubjectId: classSubjectIdFilter ? Number(classSubjectIdFilter) : undefined,
    actualTeacherId: !isGlobalView ? (user?.public_id || String(user?.id)) : (teacherIdFilter || undefined),
    sessionDate: dateFilter || undefined,
    isCancelled: cancelledFilter === "" ? undefined : cancelledFilter === "true",
    page,
    limit,
  });

  const { data: classSubjectsRes } = useClassSubjects({ limit: 100 });

  const classSubjectOptions = (classSubjectsRes?.data || []).map(cs => ({
    label: `${cs.class?.name} - ${cs.subject?.name}`,
    value: String(cs.id)
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TeachingSession | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  
  const [formData, setFormData] = useState<CreateTeachingSessionDto>({
    classSubjectId: 0,
    actualTeacherId: "",
    sessionDate: "",
    startTime: "",
    endTime: "",
    teachingUnits: 1,
    periodInfo: "",
    isSubstitution: false,
    substituteForTeacherId: null,
    isCancelled: false,
    notes: "",
  });

  const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const searchTeachers = useCallback(async (term: string) => {
    setIsSearchingTeachers(true);
    try {
      const employees = await profilesService.getEmployees({
        search: term,
        limit: 10,
      });
      setTeacherOptions(
        employees.data.map((e) => ({
          label: e.user?.name || "Unknown",
          value: e.user?.public_id || "",
          subLabel: e.user?.email,
        }))
      );
    } catch (error) {
      console.error("Failed to search teachers", error);
    } finally {
      setIsSearchingTeachers(false);
    }
  }, []);

  const [isSearchingSubstitute, setIsSearchingSubstitute] = useState(false);
  const [substituteOptions, setSubstituteOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const searchSubstitute = useCallback(async (term: string) => {
    setIsSearchingSubstitute(true);
    try {
      const employees = await profilesService.getEmployees({
        search: term,
        limit: 10,
      });
      setSubstituteOptions(
        employees.data.map((e) => ({
          label: e.user?.name || "Unknown",
          value: e.user?.public_id || "",
          subLabel: e.user?.email,
        }))
      );
    } catch (error) {
      console.error("Failed to search teachers", error);
    } finally {
      setIsSearchingSubstitute(false);
    }
  }, []);

  const [isSearchingTeachersFilter, setIsSearchingTeachersFilter] = useState(false);
  const [teacherOptionsFilter, setTeacherOptionsFilter] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const searchTeachersFilter = useCallback(async (term: string) => {
    setIsSearchingTeachersFilter(true);
    try {
      const employees = await profilesService.getEmployees({
        search: term,
        limit: 10,
      });
      setTeacherOptionsFilter(
        employees.data.map((e) => ({
          label: e.user?.name || "Unknown",
          value: e.user?.public_id || "",
          subLabel: e.user?.email,
        }))
      );
    } catch (error) {
      console.error("Failed to search teachers", error);
    } finally {
      setIsSearchingTeachersFilter(false);
    }
  }, []);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sessions = useMemo(() => {
    return response?.data || [];
  }, [response]);
  
  const sortedSessions = useMemo(() => {
    if (!sortConfig) return sessions;
    return [...sessions].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number = "";
      let valB: string | number = "";

      if (key === "teacher") {
        valA = a.actualTeacher?.name || "";
        valB = b.actualTeacher?.name || "";
      } else if (key === "class") {
        valA = a.classSubject?.class?.name || "";
        valB = b.classSubject?.class?.name || "";
      } else if (key === "subject") {
        valA = a.classSubject?.subject?.name || "";
        valB = b.classSubject?.subject?.name || "";
      } else if (key === "date") {
        valA = a.sessionDate;
        valB = b.sessionDate;
      } else {
        valA = String((a as unknown as Record<string, unknown>)[key] ?? "");
        valB = String((b as unknown as Record<string, unknown>)[key] ?? "");
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [sessions, sortConfig]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = response?.meta?.itemCount || 0;
  const totalPages = response?.meta?.pageCount || 1;

  const handleOpenModal = (session?: TeachingSession) => {
    if (session) {
      setSelectedSession(session);
      setFormData({
        classSubjectId: session.classSubjectId,
        actualTeacherId: session.actualTeacherId,
        sessionDate: session.sessionDate,
        startTime: session.startTime.substring(0, 5),
        endTime: session.endTime.substring(0, 5),
        teachingUnits: session.teachingUnits,
        periodInfo: session.periodInfo || "",
        isSubstitution: session.isSubstitution,
        substituteForTeacherId: session.substituteForTeacherId,
        isCancelled: session.isCancelled,
        notes: session.notes || "",
      });
      // Pre-populate actual teacher options
      if (session.actualTeacher) {
        setTeacherOptions([{
          label: session.actualTeacher.name || "Unknown",
          value: session.actualTeacher.public_id || "",
          subLabel: session.actualTeacher.email
        }]);
      }
      // Pre-populate substitute teacher options
      if (session.substituteForTeacher) {
        setSubstituteOptions([{
          label: session.substituteForTeacher.name || "Unknown",
          value: session.substituteForTeacher.public_id || "",
          subLabel: session.substituteForTeacher.email
        }]);
      }
    } else {
      setSelectedSession(null);
      setFormData({
        classSubjectId: (classSubjectsRes?.data?.[0]?.id as number) || 0,
        actualTeacherId: "",
        sessionDate: new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        teachingUnits: 1,
        periodInfo: "",
        isSubstitution: false,
        substituteForTeacherId: null,
        isCancelled: false,
        notes: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.classSubjectId || !formData.actualTeacherId || !formData.sessionDate || !formData.startTime || !formData.endTime) {
        showError("Please fill in all required fields");
        return;
    }

    const payload: CreateTeachingSessionDto = {
        ...formData,
        startTime: formData.startTime.length === 5 ? `${formData.startTime}:00` : formData.startTime,
        endTime: formData.endTime.length === 5 ? `${formData.endTime}:00` : formData.endTime,
    };

    const confirmed = await confirm({
      variant: selectedSession ? 'update' : 'create',
      title: selectedSession ? 'Update Teaching Session' : 'Record Teaching Session',
      message: `Are you sure you want to ${selectedSession ? 'update' : 'record'} this teaching session?`,
    });

    if (!confirmed) return;

    try {
      if (selectedSession) {
        await updateMutation.mutateAsync({ 
          id: selectedSession.id,
          data: payload as UpdateTeachingSessionDto 
        });
        showSuccess(`Session updated successfully!`);
      } else {
        await createMutation.mutateAsync(payload);
        showSuccess(`Session recorded successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save session");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Session',
      message: 'Are you sure you want to delete this teaching session? This action cannot be undone.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Session deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete session");
      }
    }
  };

  return (
    <>
      <PageMeta title="Teaching Sessions | Visia" description="Manage and track actual teaching sessions and substitutions." />
      <PageBreadcrumb pageTitle="Teaching Sessions" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teaching Sessions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Records of actual lesson occurrences, including substitutions.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="size-4 fill-current" />
            Record Session
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-100 dark:border-white/[0.05]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
            <CustomSelect
              label="Class Subject"
              placeholder="All Class Subjects"
              value={classSubjectIdFilter}
              onChange={(val: string | number) => { setClassSubjectIdFilter(String(val)); setPage(1); }}
              options={[{ label: "All Class Subjects", value: "" }, ...classSubjectOptions]}
            />

            {isGlobalView && (
              <SearchableAsyncSelect
                  label="Teacher Filter"
                  placeholder="Search teacher..."
                  value={teacherIdFilter}
                  onChange={(val) => { setTeacherIdFilter(String(val)); setPage(1); }}
                  onSearch={searchTeachersFilter}
                  options={[{ label: "All Teachers", value: "" }, ...teacherOptionsFilter]}
                  isLoading={isSearchingTeachersFilter}
              />
            )}

            <DatePicker
                label="Session Date"
                value={dateFilter}
                onChange={(val) => { setDateFilter(val); setPage(1); }}
                placeholder="All Dates"
            />

            <CustomSelect
              label="Status"
              value={cancelledFilter}
              onChange={(val: string | number) => { setCancelledFilter(String(val)); setPage(1); }}
              options={[
                { label: "All Status", value: "" },
                { label: "Active", value: "false" },
                { label: "Cancelled", value: "true" },
              ]}
            />

            <div className="flex items-end">
                <button
                    onClick={() => {
                        setClassSubjectIdFilter("");
                        setTeacherIdFilter("");
                        setDateFilter("");
                        setCancelledFilter("");
                        setPage(1);
                    }}
                    className="flex size-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-brand-500 hover:text-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-500"
                    title="Reset Filters"
                >
                    <CloseIcon className="size-5" />
                </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("date")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Date & Time <SortIcon column={"date"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("class")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Class & Subject <SortIcon column={"class"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("teacher")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Actual Teacher <SortIcon column={"teacher"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Units</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading sessions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <CalenderIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No teaching sessions found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="size-3" />
                        Record your first session
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedSessions.map((session: TeachingSession) => (
                  <TableRow key={session.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium text-theme-sm">
                           <CalenderIcon className="size-3.5 opacity-50" />
                           {session.sessionDate}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs text-[10px] font-semibold uppercase tracking-wider">
                           <TimeIcon className="size-3.5 opacity-50" />
                           {session.startTime.substring(0, 5)} - {session.endTime.substring(0, 5)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium text-theme-sm">
                           <GridIcon className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
                           {session.classSubject?.class?.name}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                           <BoxIcon className="size-3.5 opacity-50" />
                           {session.classSubject?.subject?.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                          {session.actualTeacher?.photo ? (
                            <img src={session.actualTeacher.photo} alt={session.actualTeacher.name} className="size-full object-cover" />
                          ) : (
                            <UserIcon className="size-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{session.actualTeacher?.name || "Unknown"}</p>
                          {session.isSubstitution && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                               Substitution for {session.substituteForTeacher?.name || "N/A"}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                       <span className="inline-flex py-1 px-3 rounded-lg bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-300">
                         {session.teachingUnits} Units
                       </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge color={session.isCancelled ? "error" : "success"}>
                        {session.isCancelled ? "Cancelled" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleViewAttendance(session)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                          title="View Attendance"
                        >
                          <UserCircleIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(session)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
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
               Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
               <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
               <span className="font-medium text-gray-700 dark:text-white">{total}</span> sessions
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
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
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
        title={selectedSession ? "Update Teaching Session" : "Record New Teaching Session"}
        description="Enter the details of the lesson occurrence, including the actual teacher and units taught."
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
              form="teaching-session-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedSession ? "Update Session" : "Record Session"}
            </button>
          </div>
        }
      >
          <form id="teaching-session-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <CustomSelect
                    label="Class Subject"
                    placeholder="Select class subject..."
                    value={String(formData.classSubjectId || "")}
                    onChange={(val) => setFormData({ ...formData, classSubjectId: Number(val) })}
                    options={classSubjectOptions}
                />

                <DatePicker
                    label="Session Date"
                    value={formData.sessionDate}
                    onChange={(val) => setFormData({ ...formData, sessionDate: val })}
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <DatePicker
                    label="Start Time"
                    value={formData.startTime}
                    onChange={(val) => setFormData({ ...formData, startTime: val })}
                    type="time"
                    required
                />
                <DatePicker
                    label="End Time"
                    value={formData.endTime}
                    onChange={(val) => setFormData({ ...formData, endTime: val })}
                    type="time"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <SearchableAsyncSelect
                    label="Actual Teacher"
                    placeholder="Search teacher..."
                    value={formData.actualTeacherId}
                    onChange={(val) => setFormData({ ...formData, actualTeacherId: String(val) })}
                    onSearch={searchTeachers}
                    options={teacherOptions}
                    isLoading={isSearchingTeachers}
                />

                <NumberInput
                    label="Teaching Units"
                    value={formData.teachingUnits}
                    onChange={(val) => setFormData({ ...formData, teachingUnits: val })}
                />
            </div>

            <div className="space-y-1.5">
                <Label>Subject Period (Mapel Ke)</Label>
                <input
                    type="text"
                    placeholder="e.g. 1, 1-2, 3-4"
                    value={formData.periodInfo || ""}
                    onChange={(e) => setFormData({ ...formData, periodInfo: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
            </div>

            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/30 p-4 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-gray-900 dark:text-white">Substitution Lesson</Label>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Is this lesson substituting another teacher?</p>
                    </div>
                    <Switch
                        checked={formData.isSubstitution || false}
                        onChange={(checked) => setFormData({ ...formData, isSubstitution: checked })}
                    />
                </div>

                {formData.isSubstitution && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                         <SearchableAsyncSelect
                            label="Substitute For"
                            placeholder="Select original teacher..."
                            value={formData.substituteForTeacherId || ""}
                            onChange={(val) => setFormData({ ...formData, substituteForTeacherId: String(val) })}
                            onSearch={searchSubstitute}
                            options={substituteOptions}
                            isLoading={isSearchingSubstitute}
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Cancelled Session</Label>
                <p className="text-xs text-gray-500 italic">Mark this session as cancelled.</p>
              </div>
              <Switch
                checked={formData.isCancelled || false}
                onChange={(checked) => setFormData({ ...formData, isCancelled: checked })}
              />
            </div>

            <div className="space-y-1.5">
                <Label>Notes (Optional)</Label>
                <textarea
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Lesson topic or additional info..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none h-24"
                />
            </div>
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default TeachingSessions;
