import React, { useState } from "react";
import { useClassEnrollments, useClasses, useAcademicYears } from "../../../api/hooks/useAcademic";
import { ClassEnrollment } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import { userService } from "../../../api/services/userService";
import { User } from "../../../api/types";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, AngleRightIcon, UserIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import DatePicker from "../../../components/molecules/DatePicker";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";

const ClassEnrollments: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useClassEnrollments({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    academicYearId: academicYearFilter || undefined,
    classId: classFilter || undefined,
    page,
    limit,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentOptions, setStudentOptions] = useState<{ label: string; value: string; subLabel: string }[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  // Fetch students function
  const fetchStudents = async (term: string) => {
    setIsSearchingStudents(true);
    try {
      const response = await userService.getUsers({
        search: term,
        typeCode: "student",
        limit: 20
      });
      
      const users = response.data || [];
      setStudentOptions(users
        .filter((u: User) => (u.id || u.public_id) && String(u.id || u.public_id) !== "undefined")
        .map((u: User) => ({
          label: u.name,
          value: String(u.public_id || u.id),
          subLabel: u.email
        }))
      );
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setStudentOptions([]);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  // Initial load of students (for edit mode mostly)
  React.useEffect(() => {
    if (isModalOpen) {
      fetchStudents("");
    }
  }, [isModalOpen]);

  const { data: classesResponse } = useClasses({ limit: 100 });
  const { data: academicYearsResponse } = useAcademicYears({ limit: 100 });

  const enrollments = response?.data || [];
  const total = Number(response?.meta?.total ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));


  const [selectedEnrollment, setSelectedEnrollment] = useState<ClassEnrollment | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClassEnrollment; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<Partial<ClassEnrollment>>({
    userId: "",
    classId: "",
    academicYearId: "",
    enrollmentDate: new Date().toISOString().split("T")[0],
    status: "active",
  });

  const handleSort = (key: keyof ClassEnrollment) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedEnrollments = [...enrollments].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = String(a[key] || "");
    const valB = String(b[key] || "");
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof ClassEnrollment }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const handleOpenModal = (enrollment?: ClassEnrollment) => {
    if (enrollment) {
      setSelectedEnrollment(enrollment);
      setFormData({
        userId: enrollment.userId && String(enrollment.userId) !== "undefined" ? String(enrollment.userId) : "",
        classId: enrollment.classId && String(enrollment.classId) !== "undefined" ? String(enrollment.classId) : "",
        academicYearId: enrollment.academicYearId && String(enrollment.academicYearId) !== "undefined" ? String(enrollment.academicYearId) : "",
        enrollmentDate: enrollment.enrollmentDate?.split("T")[0] || "",
        status: enrollment.status,
      });
    } else {
      setSelectedEnrollment(null);
      setFormData({
        userId: "",
        classId: "",
        academicYearId: academicYearFilter && academicYearFilter !== "all" ? academicYearFilter : "",
        enrollmentDate: new Date().toISOString().split("T")[0],
        status: "active",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final Sanitization & Validation
    const payload = {
      ...formData,
      userId: formData.userId && String(formData.userId) !== "undefined" ? String(formData.userId) : "",
      classId: formData.classId && String(formData.classId) !== "undefined" ? String(formData.classId) : "",
      academicYearId: formData.academicYearId && String(formData.academicYearId) !== "undefined" ? String(formData.academicYearId) : "",
    };

    if (!payload.userId || !payload.classId || !payload.academicYearId) {
      showError(null, "Please select student, class, and academic year.");
      return;
    }

    const confirmed = await confirm({
      variant: selectedEnrollment ? 'update' : 'create',
      title: selectedEnrollment ? 'Update Enrollment' : 'New Enrollment',
      message: `Are you sure you want to ${selectedEnrollment ? 'update' : 'create'} this student enrollment?`,
    });

    if (!confirmed) return;

    try {
      if (selectedEnrollment) {
        await updateMutation.mutateAsync({ id: selectedEnrollment.id, data: payload });
        showSuccess("Enrollment updated successfully!");
      } else {
        await createMutation.mutateAsync(payload);
        showSuccess("Student enrolled successfully!");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save enrollment");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Enrollment',
      message: 'Are you sure you want to delete this class enrollment? This action will remove the student from this class.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Enrollment deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete enrollment");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "success";
      case "withdrawn": return "error";
      case "graduated": return "info";
      default: return "light";
    }
  };

  return (
    <>
      <PageMeta title="Class Enrollments | Management" description="Manage student class assignments." />
      <PageBreadcrumb pageTitle="Class Enrollments" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Enrollments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Enroll students into classes for specific academic years.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />

            New Enrollment
          </button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Student</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <UserIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Student name or email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <CustomSelect
              label="Academic Year"
              value={academicYearFilter}
              onChange={(val) => { setAcademicYearFilter(val ? String(val) : ""); setPage(1); }}
              options={[
                { label: "All Years", value: "" },
                ...(academicYearsResponse?.data.map(y => ({ label: y.name, value: String(y.id) })) || []),
              ]}
            />

            <CustomSelect
              label="Class"
              value={classFilter}
              onChange={(val) => { setClassFilter(val ? String(val) : ""); setPage(1); }}
              options={[
                { label: "All Classes", value: "" },
                ...(classesResponse?.data.map(c => ({ label: c.name, value: String(c.id) })) || []),
              ]}
            />

            <CustomSelect
              label="Status"
              value={statusFilter}
              onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
              options={[
                { label: "All Status", value: "" },
                { label: "Active", value: "active" },
                { label: "Withdrawn", value: "withdrawn" },
                { label: "Graduated", value: "graduated" },
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("userId")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Student <SortIcon column="userId" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("classId")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Class <SortIcon column="classId" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("academicYearId")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Academic Year <SortIcon column="academicYearId" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading enrollments...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedEnrollments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <GridIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No enrollments found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />

                        Create first enrollment
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedEnrollments.map((en) => (
                  <TableRow key={en.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                          <UserIcon className="size-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{en.user?.name || "Unknown Student"}</p>
                          <p className="text-[11px] text-gray-500">{en.user?.email || `ID: ${en.userId}`}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <p className="text-gray-700 dark:text-gray-300 font-medium text-theme-sm">{en.class?.name || "N/A"}</p>
                      <p className="text-[11px] text-gray-500">{en.class?.code || "No Code"}</p>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <p className="text-gray-500 dark:text-gray-400 text-theme-sm">{en.academicYear?.name || "N/A"}</p>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge color={getStatusColor(en.status)}>
                        {en.status.charAt(0).toUpperCase() + en.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(en)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(en.id)}
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
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> enrollments
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            {selectedEnrollment ? "Update Enrollment" : "New Enrollment"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <SearchableAsyncSelect
              label="Student"
              value={formData.userId as string}
              onChange={(val) => setFormData({ ...formData, userId: val && String(val) !== "undefined" ? String(val) : "" })}
              onSearch={fetchStudents}
              options={studentOptions}
              isLoading={isSearchingStudents}
              placeholder="Type to search student name or email..."
            />
            
            <div className="grid grid-cols-2 gap-4">
              <CustomSelect
                label="Class"
                value={String(formData.classId || "")}
                onChange={(val) => setFormData({ ...formData, classId: val && String(val) !== "undefined" ? String(val) : "" })}
                options={[
                  { label: "Select Class", value: "" },
                  ...(classesResponse?.data
                    ?.filter(c => c.id && String(c.id) !== "undefined")
                    ?.map(c => ({ label: c.name, value: String(c.id) })) || []),
                ]}
              />
              <CustomSelect
                label="Academic Year"
                value={String(formData.academicYearId || "")}
                onChange={(val) => setFormData({ ...formData, academicYearId: val && String(val) !== "undefined" ? String(val) : "" })}
                options={[
                  { label: "Select Year", value: "" },
                  ...(academicYearsResponse?.data
                    ?.filter(y => y.id && String(y.id) !== "undefined")
                    ?.map(y => ({ label: y.name, value: String(y.id) })) || []),
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker
              label="Enrollment Date"
              value={formData.enrollmentDate ?? null}
              onChange={(date) => setFormData({ ...formData, enrollmentDate: date })}
              required
            />
              <CustomSelect
                label="Status"
                value={formData.status || "active"}
                onChange={(val) => setFormData({ ...formData, status: val as ClassEnrollment['status'] })}
                options={[
                  { label: "Active", value: "active" },
                  { label: "Withdrawn", value: "withdrawn" },
                  { label: "Graduated", value: "graduated" },
                ]}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
              >
                {selectedEnrollment ? "Update" : "Enroll Student"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ClassEnrollments;
