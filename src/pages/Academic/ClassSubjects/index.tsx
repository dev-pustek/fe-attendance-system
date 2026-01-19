import React, { useState } from "react";
import { useClassSubjects, useSubjects, useClasses, useAcademicYears } from "../../../api/hooks/useAcademic";
import { ClassSubject, CreateClassSubjectDto, UpdateClassSubjectDto } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, ChevronLeftIcon, AngleRightIcon, BoxIcon, ChevronUpIcon, ChevronDownIcon, CalenderIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import Label from "../../../components/atoms/Label";
import NumberInput from "../../../components/atoms/NumberInput";

const ClassSubjects: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classIdFilter, setClassIdFilter] = useState("");
  const [subjectIdFilter, setSubjectIdFilter] = useState("");
  const [academicYearIdFilter, setAcademicYearIdFilter] = useState("");
  
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useClassSubjects({
    search: debouncedSearch || undefined,
    classId: classIdFilter || undefined,
    subjectId: subjectIdFilter || undefined,
    academicYearId: academicYearIdFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const { data: subjectsRes } = useSubjects({ limit: 100 });
  const { data: classesRes } = useClasses({ limit: 100 });
  const { data: yearsRes } = useAcademicYears({ limit: 100 });

  const subjectOptions = (subjectsRes?.data || []).map(s => ({
    label: `${s.code} - ${s.name}`,
    value: s.id
  }));

  const classOptions = (classesRes?.data || []).map(c => ({
    label: c.name,
    value: c.id
  }));

  const academicYearOptions = (yearsRes?.data || []).map(y => ({
    label: y.name,
    value: y.id
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ClassSubject | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClassSubject; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<CreateClassSubjectDto>({
    classId: "",
    subjectId: "",
    academicYearId: "",
    plannedTotalUnits: 0,
    plannedUnitsPerWeek: 0,
    isActive: true,
  });

  const handleSort = (key: keyof ClassSubject) => {
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

      if (key === "class") {
        valA = a.class?.name || "";
        valB = b.class?.name || "";
      } else if (key === "subject") {
        valA = a.subject?.name || "";
        valB = b.subject?.name || "";
      } else if (key === "academicYear") {
        valA = a.academicYear?.name || "";
        valB = b.academicYear?.name || "";
      } else {
        valA = String(a[key] ?? "");
        valB = String(b[key] ?? "");
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [assignments, sortConfig]);

  const SortIcon = ({ column }: { column: keyof ClassSubject }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = response?.meta?.itemCount || 0;
  const totalPages = response?.meta?.pageCount || 1;

  const handleOpenModal = (assignment?: ClassSubject) => {
    if (assignment) {
      setSelectedAssignment(assignment);
      setFormData({
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        academicYearId: assignment.academicYearId,
        plannedTotalUnits: assignment.plannedTotalUnits || 0,
        plannedUnitsPerWeek: assignment.plannedUnitsPerWeek || 0,
        isActive: assignment.isActive,
      });
    } else {
      setSelectedAssignment(null);
      setFormData({
        classId: "",
        subjectId: "",
        academicYearId: "",
        plannedTotalUnits: 0,
        plannedUnitsPerWeek: 0,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.classId || !formData.subjectId || !formData.academicYearId) {
        showError("Please select class, subject and academic year");
        return;
    }

    const confirmed = await confirm({
      variant: selectedAssignment ? 'update' : 'create',
      title: selectedAssignment ? 'Update Assignment' : 'Create Assignment',
      message: `Are you sure you want to ${selectedAssignment ? 'update' : 'create'} this class subject assignment?`,
    });

    if (!confirmed) return;

    try {
      if (selectedAssignment) {
        await updateMutation.mutateAsync({ 
          id: selectedAssignment.id,
          data: formData as UpdateClassSubjectDto 
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
      message: 'Are you sure you want to remove this class subject assignment? This action cannot be undone.',
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
      <PageMeta title="Class Subjects | Visia" description="Manage subjects taught in each class." />
      <PageBreadcrumb pageTitle="Class Subjects" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Subjects</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Define subjects taught in specific classes per academic year.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="size-4 fill-current" />
            Assign Class Subject
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-100 dark:border-white/[0.05]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Class or subject name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <CustomSelect
              label="Class"
              placeholder="All Classes"
              value={classIdFilter}
              onChange={(val: string | number) => { setClassIdFilter(String(val)); setPage(1); }}
              options={[{ label: "All Classes", value: "" }, ...classOptions]}
            />

            <CustomSelect
              label="Subject"
              placeholder="All Subjects"
              value={subjectIdFilter}
              onChange={(val: string | number) => { setSubjectIdFilter(String(val)); setPage(1); }}
              options={[{ label: "All Subjects", value: "" }, ...subjectOptions]}
            />

            <CustomSelect
              label="Academic Year"
              placeholder="All Years"
              value={academicYearIdFilter}
              onChange={(val: string | number) => { setAcademicYearIdFilter(String(val)); setPage(1); }}
              options={[{ label: "All Years", value: "" }, ...academicYearOptions]}
            />

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

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("class")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Class <SortIcon column={"class"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("subject")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Subject <SortIcon column={"subject"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("academicYear")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Year <SortIcon column={"academicYear"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">JP/Units</TableCell>
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
                      <span className="text-sm">Loading assignments...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <BoxIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No class subjects found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="size-3" />
                        Assign your first class subject
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAssignments.map((assignment: ClassSubject) => (
                  <TableRow key={assignment.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                          <GridIcon className="size-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{assignment.class?.name || "Unknown Class"}</p>
                          <span className="inline-flex items-center rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-white/5 dark:text-gray-400 uppercase tracking-widest">{assignment.class?.code}</span>
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
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <CalenderIcon className="size-4 opacity-50" />
                        <span className="text-theme-sm">{assignment.academicYear?.code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-theme-sm font-semibold text-gray-900 dark:text-white">{assignment.plannedTotalUnits}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{assignment.plannedUnitsPerWeek} JP/Week</span>
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
        className="max-w-xl"
        title={selectedAssignment ? "Update Class Subject" : "Assign Subject to Class"}
        description="Configure which subject is taught in which class for the selected academic year."
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
              form="class-subject-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedAssignment ? "Update Assignment" : "Assign Class Subject"}
            </button>
          </div>
        }
      >
          <form id="class-subject-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelect
                    label="Class"
                    placeholder="Select class..."
                    value={formData.classId}
                    onChange={(val) => setFormData({ ...formData, classId: val })}
                    options={classOptions}
                />

                <CustomSelect
                    label="Subject"
                    placeholder="Select subject..."
                    value={formData.subjectId}
                    onChange={(val) => setFormData({ ...formData, subjectId: val })}
                    options={subjectOptions}
                />
            </div>

            <CustomSelect
                label="Academic Year"
                placeholder="Select year..."
                value={formData.academicYearId}
                onChange={(val) => setFormData({ ...formData, academicYearId: val })}
                options={academicYearOptions}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberInput
                    label="Planned Total Units (JP)"
                    value={formData.plannedTotalUnits || 0}
                    onChange={(val) => setFormData({ ...formData, plannedTotalUnits: Number(val) })}
                />
                <NumberInput
                    label="Units Per Week (JP/Week)"
                    value={formData.plannedUnitsPerWeek || 0}
                    onChange={(val) => setFormData({ ...formData, plannedUnitsPerWeek: Number(val) })}
                />
            </div>

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

export default ClassSubjects;
