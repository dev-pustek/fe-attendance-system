import React, { useState } from "react";
import { Link } from "react-router";
import { useClasses, useAcademicYears, useEducationLevels, useGrades, useMajors } from "../../../api/hooks/useAcademic";
import { Class, CreateClassDto } from "../../../api/types/academic";
import { User } from "../../../api/types/user";
import { useUsers } from "../../../api/hooks/useUsers";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, AngleRightIcon } from "../../../components/atoms/Icons";
import NumberInput from "../../../components/molecules/NumberInput";
import Badge from "../../../components/atoms/Badge";
import Switch from "../../../components/atoms/Switch";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";

const Classes: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();
  const [teacherSearch, setTeacherSearch] = useState("");
  const debouncedTeacherSearch = useDebounce(teacherSearch, 500);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useClasses({
    search: debouncedSearch || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    grade: gradeFilter === "" ? undefined : parseInt(gradeFilter),
    major: majorFilter || undefined,
    page,
    limit,
  });

  const classes = response?.data || [];
  const total = Number(response?.meta?.total ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const { data: academicYearsData } = useAcademicYears({ isActive: true });
  const academicYears = academicYearsData?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [initialTeacherName, setInitialTeacherName] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Class; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<CreateClassDto>({
    code: "",
    name: "",
    educationLevelId: "" as number | string,
    gradeId: "" as number | string,
    majorId: "" as number | string,
    academicYearId: "" as number | string,
    homeroomTeacherId: "",
    roomNumber: "",
    maxCapacity: 36,
    isActive: true,
  });

  const { users: teachers, isLoading: isLoadingTeachers } = useUsers({ 
    typeCode: "teacher",
    search: debouncedTeacherSearch || undefined,
    limit: 100 
  });

  const { data: levelsData } = useEducationLevels({ isActive: true });
  const educationLevels = levelsData?.data || [];

  const { data: gradesData } = useGrades({ 
    educationLevelId: formData.educationLevelId || undefined,
    limit: 100
  });
  const grades = gradesData?.data || [];

  const { data: majorsData } = useMajors({ 
    educationLevelId: formData.educationLevelId || undefined,
    isActive: true,
    limit: 100
  });
  const majors = majorsData?.data || [];

  const handleSort = (key: keyof Class) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedClasses = [...classes].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = a[key] || "";
    const valB = b[key] || "";
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof Class }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const handleOpenModal = (cls?: Class) => {
    if (cls) {
      setInitialTeacherName(cls.homeroomTeacher?.name || "");
      setSelectedClass(cls);
      setFormData({
        code: cls.code || "",
        name: cls.name,
        educationLevelId: cls.educationLevelId || cls.educationLevel?.id || cls.grade?.educationLevelId || "",
        gradeId: cls.gradeId || "",
        majorId: cls.majorId || "",
        academicYearId: cls.academicYearId || "",
        homeroomTeacherId: cls.homeroomTeacherId || "",
        roomNumber: cls.roomNumber || "",
        maxCapacity: cls.maxCapacity || 36,
        isActive: cls.isActive,
      });
    } else {
      setSelectedClass(null);
      setInitialTeacherName("");
      setFormData({
        code: "",
        name: "",
        educationLevelId: "",
        gradeId: "",
        majorId: "",
        academicYearId: academicYears.length > 0 ? academicYears[0].id : "",
        homeroomTeacherId: "",
        roomNumber: "",
        maxCapacity: 36,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedClass ? 'update' : 'create',
      title: selectedClass ? 'Update Class' : 'Create Class',
      message: `Are you sure you want to ${selectedClass ? 'update' : 'create'} the class "${formData.name}"?`,
    });

    if (!confirmed) return;

    try {
      const payload = {
        ...formData,
        educationLevelId: Number(formData.educationLevelId),
        gradeId: Number(formData.gradeId),
        majorId: Number(formData.majorId),
        academicYearId: Number(formData.academicYearId),
        homeroomTeacherId: formData.homeroomTeacherId || null,
        maxCapacity: Number(formData.maxCapacity),
      };

      if (selectedClass) {
        await updateMutation.mutateAsync({ id: selectedClass.id, data: payload });
        showSuccess(`Class "${formData.name}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(payload);
        showSuccess(`Class "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save class");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Class',
      message: 'Are you sure you want to delete this class? This action cannot be undone and may affect related students and attendance data.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Class deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete class");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(classes.map((c: Class) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmed = await confirm({
      variant: 'delete',
      title: 'Bulk Delete Classes',
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected classes? This action cannot be undone and may affect related students and attendance data.`,
      confirmText: `Delete ${selectedIds.length} Classes`
    });

    if (confirmed) {
      try {
        const promises = selectedIds.map(id => deleteMutation.mutateAsync(id));
        await Promise.all(promises);
        showSuccess(`Successfully removed ${selectedIds.length} classes.`);
        setSelectedIds([]);
      } catch (error) {
        showError(error, "Failed to remove some classes");
      }
    }
  };

  return (
    <>
      <PageMeta title="Classes | Management" description="Manage student classes and majors." />
      <PageBreadcrumb pageTitle="Classes" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Registry</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage classroom organization and majors.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />

            Add New Class
          </button>
        </div>

        {/* Bulk Selection Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm font-mono">
                {selectedIds.length}
              </div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Classes Selected</p>
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

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Class</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Code, name, or major..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <CustomSelect
              label="Grade / Level"
              value={gradeFilter}
              onChange={(val) => { setGradeFilter(String(val)); setPage(1); }}
              options={[
                { label: "All Grades", value: "" },
                { label: "Grade 10", value: "10" },
                { label: "Grade 11", value: "11" },
                { label: "Grade 12", value: "12" },
              ]}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Major</label>
              <input
                type="text"
                placeholder="e.g. RPL, TKJ..."
                value={majorFilter}
                onChange={(e) => { setMajorFilter(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
              />
            </div>

            <CustomSelect
              label="Status"
              value={statusFilter}
              onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
              options={[
                { label: "All Status", value: "" },
                { label: "Active Only", value: "true" },
                { label: "Archived Only", value: "false" },
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
            <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="w-10 px-5 py-4">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      checked={classes.length > 0 && selectedIds.length === classes.length}
                      onChange={handleSelectAll}
                    />
                  </div>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Class Identity <SortIcon column="name" />
                  </button>
                </TableCell>

                <TableCell isHeader className="px-5 py-4">
                  <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Homeroom Teacher</span>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-center">
                  <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</span>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Schedule Stats</span>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading classes...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <GridIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No classes found matching your search.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />
                        Register your first class
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedClasses.map((cls) => (
                  <TableRow key={cls.id} className={`group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors ${selectedIds.includes(cls.id) ? 'bg-brand-50/30 dark:bg-brand-500/5' : ''}`}>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          checked={selectedIds.includes(cls.id)}
                          onChange={() => handleSelectRow(cls.id)}
                        />
                      </div>
                    </TableCell>
                    {/* Class Identity */}
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{cls.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{cls.code}</span>
                      </div>
                    </TableCell>



                    {/* Homeroom Teacher */}
                    <TableCell className="px-5 py-4">
                      {cls.homeroomTeacher ? (
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden shrink-0">
                            {cls.homeroomTeacher.photo ? (
                              <img src={cls.homeroomTeacher.photo} alt={cls.homeroomTeacher.name} className="size-full object-cover" />
                            ) : (
                              <div className="size-full flex items-center justify-center text-gray-400 text-xs font-bold">
                                {cls.homeroomTeacher.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{cls.homeroomTeacher.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {(cls.homeroomTeacher.profile as any)?.employeeId ? `NIP: ${(cls.homeroomTeacher.profile as any)?.employeeId}` : cls.homeroomTeacher.email}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Students */}
                    <TableCell className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-gray-900 dark:text-white">{cls.totalStudents || 0}</span>
                                <span className="text-xs text-gray-400">/ {cls.maxCapacity}</span>
                            </div>
                            <div className="w-16 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                                <div 
                                    className={`h-full rounded-full ${
                                        (cls.totalStudents || 0) >= (cls.maxCapacity || 36) ? 'bg-error-500' : 
                                        (cls.totalStudents || 0) >= ((cls.maxCapacity || 36) * 0.8) ? 'bg-warning-500' : 'bg-success-500'
                                    }`}
                                    style={{ width: `${Math.min(((cls.totalStudents || 0) / (cls.maxCapacity || 36)) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </TableCell>

                    {/* Schedule Stats */}
                    <TableCell className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="text-gray-500 dark:text-gray-400">Scheduled JP</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {cls.totalScheduledJP || 0} <span className="text-gray-400 font-normal">/ {cls.totalPlannedJP || 0}</span>
                                </span>
                            </div>
                            {/* Simple progress bar for JP */}
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-500 rounded-full"
                                    style={{ width: `${Math.min(((cls.totalScheduledJP || 0) / (Math.max(cls.totalPlannedJP || 1, 1))) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-5 py-4">
                      <Badge color={cls.isActive ? "success" : "light"}>
                        {cls.isActive ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/academic/classes/${cls.id}/manage`}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                          title="Manage Class Cockpit"
                        >
                          <GridIcon className="size-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenModal(cls)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cls.id)}
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

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> classes
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
                <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
        className="max-w-2xl"
        title={selectedClass ? "Edit Class" : "Register New Class"}
        description={selectedClass ? "Update the details for this class registry." : "Fill in the information below to create a new class."}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const form = document.getElementById('class-form') as HTMLFormElement;
                form?.requestSubmit();
              }}
              className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedClass ? "Update Changes" : "Create Class"}
            </button>
          </div>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-white/5 pb-2">
              <h3 className="text-sm font-bold text-brand-500 uppercase tracking-tight">Academic Context</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Education Level</label>
                <CustomSelect
                  value={formData.educationLevelId}
                  onChange={(val) => setFormData({ ...formData, educationLevelId: val, gradeId: "", majorId: "" })}
                  options={educationLevels.map(l => ({ label: l.name, value: l.id }))}
                  placeholder="Select Level"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</label>
                <CustomSelect
                  value={formData.academicYearId}
                  onChange={(val) => setFormData({ ...formData, academicYearId: val })}
                  options={academicYears.map(ay => ({ label: ay.code, value: ay.id }))}
                  placeholder="Select Year"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Grade Level</label>
                <CustomSelect
                  disabled={!formData.educationLevelId}
                  value={formData.gradeId}
                  onChange={(val) => setFormData({ ...formData, gradeId: val })}
                  options={grades.map(g => ({ label: g.name, value: g.id }))}
                  placeholder={formData.educationLevelId ? "Select Grade" : "Select Level first"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Major / Program</label>
                <CustomSelect
                  disabled={!formData.educationLevelId}
                  value={formData.majorId}
                  onChange={(val) => setFormData({ ...formData, majorId: val })}
                  options={majors.map(m => ({ label: m.name, value: m.id }))}
                  placeholder={formData.educationLevelId ? "Select Major" : "Select Level first"}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-white/5 pb-2">
              <h3 className="text-sm font-bold text-brand-500 uppercase tracking-tight">Class Identity</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Class Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                  placeholder="e.g. X-TKJ-1"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                  placeholder="e.g. X Teknik Komputer Jaringan 1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Homeroom Teacher</label>
                <SearchableAsyncSelect
                  value={formData.homeroomTeacherId || ""}
                  initialLabel={initialTeacherName}
                  onChange={(val: string | number) => setFormData({ ...formData, homeroomTeacherId: val ? String(val) : "" })}
                  onSearch={setTeacherSearch}
                  options={teachers.map((t: User) => ({
                    label: t.name,
                    value: t.public_id,
                    subLabel: (t.profile as any)?.employeeId || t.public_id
                  }))}
                  isLoading={isLoadingTeachers}
                  placeholder="Select Teacher"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Room Number</label>
                <input
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                  placeholder="e.g. A-101"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-b border-gray-100 dark:border-white/5 pb-2">
              <h3 className="text-sm font-bold text-brand-500 uppercase tracking-tight">Capacity & Status</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <NumberInput
                  label="Max Capacity"
                  value={formData.maxCapacity}
                  onChange={(val: number) => setFormData({ ...formData, maxCapacity: val || 36 })}
                  placeholder="e.g. 36"
              />
              {/* Status Toggle */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-normal uppercase text-gray-500 tracking-wider">Class Status</label>
                <div 
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                        formData.isActive 
                        ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                        : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                    }`}
                >
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold ${
                            formData.isActive ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                        }`}>
                            {formData.isActive ? "Active Class" : "Archived Class"}
                        </span>
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-tight">
                            {formData.isActive ? "Visible in enrollment and scheduling" : "Hidden from active operations"}
                        </span>
                    </div>
                    <Switch 
                        checked={formData.isActive}
                        onChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
                    />
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Classes;
