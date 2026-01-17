import React, { useState } from "react";
import { useAcademicYears } from "../../../api/hooks/useAcademic";
import { AcademicYear } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  AngleRightIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  GridIcon
} from "../../../components/atoms/Icons";
import DatePicker from "../../../components/molecules/DatePicker";
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";

const AcademicYears: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useAcademicYears({
    search: debouncedSearch || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const years = response?.data || [];
  const total = Number(response?.meta?.total ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof AcademicYear; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<Partial<AcademicYear>>({
    code: "",
    name: "",
    startDate: "",
    endDate: "",
    isActive: false,
  });

  const handleSort = (key: keyof AcademicYear) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedYears = [...years].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = a[key] || "";
    const valB = b[key] || "";
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof AcademicYear }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const handleOpenModal = (year?: AcademicYear) => {
    if (year) {
      setSelectedYear(year);
      setFormData({
        code: year.code,
        name: year.name,
        startDate: year.startDate?.split("T")[0] || "",
        endDate: year.endDate?.split("T")[0] || "",
        isActive: year.isActive,
      });
    } else {
      setSelectedYear(null);
      setFormData({
        code: "",
        name: "",
        startDate: "",
        endDate: "",
        isActive: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedYear ? 'update' : 'create',
      title: selectedYear ? 'Update Academic Year' : 'Create Academic Year',
      message: `Are you sure you want to ${selectedYear ? 'update' : 'create'} the academic year "${formData.name}"?`,
    });

    if (!confirmed) return;

    try {
      if (selectedYear) {
        await updateMutation.mutateAsync({ id: selectedYear.id, data: formData });
        showSuccess(`Academic year "${formData.name}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess(`Academic year "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save academic year");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Academic Year',
      message: 'Are you sure you want to delete this academic year? This action cannot be undone and may affect related data.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Academic year deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete academic year");
      }
    }
  };

  return (
    <>
      <PageMeta title="Academic Years | Management" description="Manage academic years and periods." />
      <PageBreadcrumb pageTitle="Academic Years" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Academic Periods</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage school years and active status.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />
            Add New Year
          </button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Period</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="By code or name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <div className="w-full sm:w-48">
              <CustomSelect
                label="Status"
                value={statusFilter}
                onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
                options={[
                  { label: "All Status", value: "" },
                  { label: "Active Only", value: "true" },
                  { label: "Inactive Only", value: "false" },
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
                  <button onClick={() => handleSort("code")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Code <SortIcon column="code" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Name <SortIcon column="name" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("startDate")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Duration <SortIcon column="startDate" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading academic years...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedYears.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <PlusIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No academic years found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />

                        Add your first year
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedYears.map((year) => (
                  <TableRow key={year.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4 font-medium text-gray-900 dark:text-white text-theme-sm">{year.code}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300 text-theme-sm">{year.name}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 dark:text-gray-400 text-theme-sm">
                      {year.startDate ? new Date(year.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"} - {year.endDate ? new Date(year.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge color={year.isActive ? "success" : "light"}>
                        {year.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(year)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(year.id)}
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
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> periods
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
            {selectedYear ? "Update Academic Year" : "Add New Academic Year"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Year Code (e.g. 2024/2025)</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                label="Start Date"
                value={formData.startDate ?? null}
                onChange={(date) => setFormData({ ...formData, startDate: date })}
                required
              />
              <DatePicker
                label="End Date"
                value={formData.endDate ?? null}
                onChange={(date) => setFormData({ ...formData, endDate: date })}
                required
              />
            </div>
            <div className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                id="isActiveYear"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="isActiveYear" className="text-sm text-gray-700 dark:text-gray-300">Set as Primary/Active Academic Year</label>
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
                {selectedYear ? "Update Year" : "Create Year"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default AcademicYears;
