import React, { useState } from "react";
import { useTeacherSubjects, useSubjects } from "../../../api/hooks/useAcademic";
import { TeacherSubject, CreateTeacherSubjectDto, UpdateTeacherSubjectDto } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, ChevronLeftIcon, AngleRightIcon, UserIcon, BoxIcon, ChevronUpIcon, ChevronDownIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { profilesService } from "../../../api/services/profilesService";
import Switch from "../../../components/atoms/Switch";
import Label from "../../../components/atoms/Label";

const TeacherSubjects: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [teacherIdFilter, setTeacherIdFilter] = useState("");
  const [subjectIdFilter, setSubjectIdFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useTeacherSubjects({
    search: debouncedSearch || undefined,
    teacherId: teacherIdFilter || undefined,
    subjectId: subjectIdFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const { data: subjectsRes } = useSubjects({ limit: 100 });
  const subjectOptions = (subjectsRes?.data || []).map(s => ({
    label: `${s.code} - ${s.name}`,
    value: s.id
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherSubject | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof TeacherSubject; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<CreateTeacherSubjectDto>({
    teacherId: "",
    subjectId: "",
    isActive: true,
  });

  const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const handleSort = (key: keyof TeacherSubject) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const assignments = React.useMemo(() => {
    return response?.data || [];
  }, [response]);
  
  const sortedAssignments = React.useMemo(() => {
    if (!sortConfig) return assignments;
    return [...assignments].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number = "";
      let valB: string | number = "";

      if (key === "teacher") {
        valA = a.teacher?.name || "";
        valB = b.teacher?.name || "";
      } else if (key === "subject") {
        valA = a.subject?.name || "";
        valB = b.subject?.name || "";
      } else {
        valA = String(a[key] ?? "");
        valB = String(b[key] ?? "");
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [assignments, sortConfig]);

  const SortIcon = ({ column }: { column: keyof TeacherSubject }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = response?.meta?.itemCount || 0;
  const totalPages = response?.meta?.pageCount || 1;

  const searchTeachers = React.useCallback(async (term: string) => {
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

  const [isSearchingTeachersFilter, setIsSearchingTeachersFilter] = useState(false);
  const [teacherOptionsFilter, setTeacherOptionsFilter] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const searchTeachersFilter = React.useCallback(async (term: string) => {
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

  const handleOpenModal = (assignment?: TeacherSubject) => {
    if (assignment) {
      setSelectedAssignment(assignment);
      setFormData({
        teacherId: assignment.teacherId,
        subjectId: assignment.subjectId,
        isActive: assignment.isActive,
      });
      if (assignment.teacher) {
        setTeacherOptions([{
            label: assignment.teacher.name,
            value: assignment.teacher.public_id,
            subLabel: assignment.teacher.email
        }]);
      }
    } else {
      setSelectedAssignment(null);
      setFormData({
        teacherId: "",
        subjectId: "",
        isActive: true,
      });
      setTeacherOptions([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.teacherId || !formData.subjectId) {
        showError("Please select both teacher and subject");
        return;
    }

    const confirmed = await confirm({
      variant: selectedAssignment ? 'update' : 'create',
      title: selectedAssignment ? 'Update Assignment' : 'Create Assignment',
      message: `Are you sure you want to ${selectedAssignment ? 'update' : 'create'} this teacher subject assignment?`,
    });

    if (!confirmed) return;

    try {
      if (selectedAssignment) {
        await updateMutation.mutateAsync({ 
          id: selectedAssignment.id,
          data: formData as UpdateTeacherSubjectDto 
        });
        showSuccess(`Assignment updated successfully!`);
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess(`Assignment created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save assignment");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Assignment',
      message: 'Are you sure you want to remove this subject assignment? This action cannot be undone.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Assignment deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete assignment");
      }
    }
  };

  return (
    <>
      <PageMeta title="Teacher Subjects | Sistem Absen" description="Manage teacher subject qualifications and assignments." />
      <PageBreadcrumb pageTitle="Teacher Subjects" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Subjects</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Assign subjects that teachers are certified to teach.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="size-4 fill-current" />
            Assign Subject
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Teacher or subject name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <div className="w-full sm:w-64">
              <SearchableAsyncSelect
                label="Teacher Filter"
                placeholder="All Teachers"
                value={teacherIdFilter}
                onChange={(val) => { setTeacherIdFilter(String(val)); setPage(1); }}
                onSearch={searchTeachersFilter}
                options={teacherOptionsFilter}
                isLoading={isSearchingTeachersFilter}
              />
            </div>

            <div className="w-full sm:w-64">
              <CustomSelect
                label="Subject Filter"
                placeholder="All Subjects"
                value={subjectIdFilter}
                onChange={(val: string | number) => { setSubjectIdFilter(String(val)); setPage(1); }}
                options={[{ label: "All Subjects", value: "" }, ...subjectOptions]}
              />
            </div>

            <div className="w-full sm:w-48">
              <CustomSelect
                label="Status"
                value={statusFilter}
                onChange={(val: string | number) => { setStatusFilter(String(val)); setPage(1); }}
                options={[
                  { label: "All Status", value: "" },
                  { label: "Active", value: "true" },
                  { label: "Inactive", value: "false" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("id")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Teacher <SortIcon column={"id"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("subjectId")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Subject <SortIcon column={"subjectId"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading assignments...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <BoxIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No assignments found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="size-3" />
                        Assign your first subject
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAssignments.map((assignment: TeacherSubject) => (
                  <TableRow key={assignment.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                          <UserIcon className="size-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{assignment.teacher?.name || "Unknown Teacher"}</p>
                          <p className="text-[11px] text-gray-500 font-mono uppercase truncate max-w-[150px]">{assignment.teacher?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                         <div className="flex size-9 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
                            <BoxIcon className="size-4 text-brand-500" />
                         </div>
                         <div>
                            <p className="text-theme-sm font-medium text-gray-900 dark:text-white">{assignment.subject?.name}</p>
                            <span className="inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 uppercase tracking-widest">{assignment.subject?.code}</span>
                         </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge color={assignment.isActive ? "success" : "error"}>
                        {assignment.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(assignment)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
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

        {/* Pagination placeholder as response doesn't have it currently based on standard pattern but service does */}
        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
               Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
               <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
               <span className="font-medium text-gray-700 dark:text-white">{total}</span> assignments
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
        className="max-w-md"
        title={selectedAssignment ? "Update Assignment" : "Assign Subject to Teacher"}
        description="Select a teacher and the subject they are qualified to teach."
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
              form="teacher-subject-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedAssignment ? "Update Assignment" : "Assign Subject"}
            </button>
          </div>
        }
      >
          <form id="teacher-subject-form" onSubmit={handleSubmit} className="space-y-4">
            <SearchableAsyncSelect
                label="Teacher"
                placeholder="Search teacher by name..."
                value={formData.teacherId}
                onChange={(val) => setFormData({ ...formData, teacherId: String(val) })}
                onSearch={searchTeachers}
                options={teacherOptions}
                isLoading={isSearchingTeachers}
            />

            <CustomSelect
                label="Subject"
                placeholder="Select subject..."
                value={formData.subjectId}
                onChange={(val) => setFormData({ ...formData, subjectId: val })}
                options={subjectOptions}
            />

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Active Status</Label>
                <p className="text-xs text-gray-500">Enable or disable this assignment.</p>
              </div>
              <Switch
                checked={formData.isActive || false}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default TeacherSubjects;
