import React, { useState } from "react";
import { useEducationLevels } from "../../../api/hooks/useAcademic";
import { EducationLevel, CreateEducationLevelDto } from "../../../api/types/academic";
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
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";

const EducationLevels: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useEducationLevels({
    search: debouncedSearch || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const levels = response?.data || [];
  const total = Number(response?.meta?.itemCount ?? response?.meta?.total ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof EducationLevel; direction: "asc" | "desc" } | null>(null);
  
  const [formData, setFormData] = useState<CreateEducationLevelDto>({
    code: "",
    name: "",
    requiresMajor: false,
    isActive: true,
  });

  const handleSort = (key: keyof EducationLevel) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedLevels = [...levels].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = String(a[key] || "");
    const valB = String(b[key] || "");
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof EducationLevel }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const handleOpenModal = (level?: EducationLevel) => {
    if (level) {
      setSelectedLevel(level);
      setFormData({
        code: level.code,
        name: level.name,
        requiresMajor: level.requiresMajor,
        isActive: level.isActive,
      });
    } else {
      setSelectedLevel(null);
      setFormData({
        code: "",
        name: "",
        requiresMajor: false,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedLevel ? 'update' : 'create',
      title: selectedLevel ? 'Update Education Level' : 'Create Education Level',
      message: `Are you sure you want to ${selectedLevel ? 'update' : 'create'} the education level "${formData.name}"?`,
    });

    if (!confirmed) return;

    try {
      if (selectedLevel) {
        await updateMutation.mutateAsync({ id: selectedLevel.id, data: formData });
        showSuccess(`Education level "${formData.name}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess(`Education level "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save education level");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Education Level',
      message: 'Are you sure you want to delete this education level? This action cannot be undone and may affect related data.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Education level deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete education level");
      }
    }
  };

  return (
    <>
      <PageMeta title="Education Levels | Management" description="Manage school education levels (SD, SMP, SMA, etc)." />
      <PageBreadcrumb pageTitle="Education Levels" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Education Levels</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage levels of education and major requirements.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />
            Add New Level
          </button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Level</label>
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
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requires Major</TableCell>
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
                      <span className="text-sm">Loading education levels...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedLevels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <PlusIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No education levels found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />
                        Add your first level
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedLevels.map((level) => (
                  <TableRow key={level.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4 font-medium text-gray-900 dark:text-white text-theme-sm">{level.code}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-300 text-theme-sm">{level.name}</TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge color={level.requiresMajor ? "primary" : "light"}>
                        {level.requiresMajor ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge color={level.isActive ? "success" : "light"}>
                        {level.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(level)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(level.id)}
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
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> items
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
        className="max-w-md"
        title={selectedLevel ? "Update Education Level" : "Add New Education Level"}
        description="Configure education levels and major requirement status."
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
                form="education-level-form"
                className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
              >
                {selectedLevel ? "Update" : "Create"}
              </button>
           </div>
        }
      >
        <div className="p-1">
          <form id="education-level-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Level Code (e.g. SMK)</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                required
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Requires Major</label>
                <p className="text-xs text-gray-500">Enable if this level has specific majors (like Vocational School)</p>
              </div>
              <Switch
                checked={formData.requiresMajor}
                onChange={(checked) => setFormData({ ...formData, requiresMajor: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-gray-50 dark:border-white/[0.05]">
              <div className="space-y-0.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Status</label>
                <p className="text-xs text-gray-500">Enable to make this education level available for selection</p>
              </div>
              <Switch
                checked={formData.isActive}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default EducationLevels;
