import React, { useState, useMemo } from "react";
import { useMajors, useEducationLevels, useProgramStudies } from "../../../api/hooks/useAcademic";
import { Major, CreateMajorDto, UpdateMajorDto } from "../../../api/types/academic";
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
  GridIcon,
  InfoIcon as MajorIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";

const Majors: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [educationLevelFilter, setEducationLevelFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useMajors({
    search: debouncedSearch || undefined,
    educationLevelId: educationLevelFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const { data: eduLevelsResponse } = useEducationLevels({ limit: 100, isActive: true });
  const eduLevels = useMemo(() => eduLevelsResponse?.data || [], [eduLevelsResponse]);

  const { data: programStudiesResponse } = useProgramStudies({ limit: 200, isActive: true });
  const allProgramStudies = useMemo(() => programStudiesResponse?.data || [], [programStudiesResponse]);

  const majors = useMemo(() => response?.data || [], [response]);
  const total = Number(response?.meta?.itemCount ?? response?.meta?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.meta?.totalPages ?? 1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Major | string; direction: "asc" | "desc" } | null>(null);
  
  const [formData, setFormData] = useState<CreateMajorDto>({
    educationLevelId: 0,
    programStudyId: 0,
    code: "",
    name: "",
    isActive: true,
  });

  const handleSort = (key: keyof Major | string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedMajors = useMemo(() => {
    if (!sortConfig) return majors;
    return [...majors].sort((a, b) => {
        const { key, direction } = sortConfig;
        let valA: string = "";
        let valB: string = "";

        if (key === "educationLevel.name") {
            valA = a.educationLevel?.name || "";
            valB = b.educationLevel?.name || "";
        } else if (key === "programStudy.name") {
            valA = a.programStudy?.name || "";
            valB = b.programStudy?.name || "";
        } else {
            // @ts-expect-error - dynamic key access
            valA = String(a[key] || "");
            // @ts-expect-error - dynamic key access
            valB = String(b[key] || "");
        }

        if (valA < valB) return direction === "asc" ? -1 : 1;
        if (valA > valB) return direction === "asc" ? 1 : -1;
        return 0;
    });
  }, [majors, sortConfig]);

  const SortIcon = ({ column }: { column: keyof Major | string }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const handleOpenModal = (major?: Major) => {
    if (major) {
      setSelectedMajor(major);
      setFormData({
        educationLevelId: major.educationLevelId,
        programStudyId: major.programStudyId,
        code: major.code,
        name: major.name,
        isActive: major.isActive,
      });
    } else {
      setSelectedMajor(null);
      setFormData({
        educationLevelId: 0,
        programStudyId: 0,
        code: "",
        name: "",
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const filteredProgramStudies = useMemo(() => {
    if (!formData.educationLevelId) return [];
    return allProgramStudies.filter(ps => Number(ps.educationLevelId) === Number(formData.educationLevelId));
  }, [formData.educationLevelId, allProgramStudies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.educationLevelId) {
        showError(null, "Please select an education level");
        return;
    }

    const confirmed = await confirm({
      variant: selectedMajor ? 'update' : 'create',
      title: selectedMajor ? 'Update Major' : 'Register New Major',
      message: `Are you sure you want to ${selectedMajor ? 'update' : 'register'} the major "${formData.name}"?`,
    });

    if (!confirmed) return;

    const payload = {
        ...formData,
        educationLevelId: parseInt(String(formData.educationLevelId), 10),
        programStudyId: parseInt(String(formData.programStudyId), 10),
    };

    try {
      if (selectedMajor) {
        await updateMutation.mutateAsync({ id: selectedMajor.id, data: payload as UpdateMajorDto });
        showSuccess(`Major "${formData.name}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(payload as CreateMajorDto);
        showSuccess(`Major "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save major");
    }
  };

  const handleToggleStatus = (major: Major) => {
    updateMutation.mutate({
        id: major.id,
        data: { isActive: !major.isActive }
    }, {
        onSuccess: () => showSuccess(`Major ${major.name} status updated`),
        onError: (err: Error) => showError(err, "Failed to update status")
    });
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Major',
      message: 'Are you sure you want to delete this major? This action cannot be undone and may affect related data.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Major deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete major");
      }
    }
  };

  return (
    <>
      <PageMeta title="Majors | Management" description="Manage school majors/departments." />
      <PageBreadcrumb pageTitle="Majors" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Majors Registry</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage specialized fields of study per education level and program.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />
            Add New Major
          </button>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Major</label>
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

            <div className="w-full sm:w-64">
                <CustomSelect
                    label="Education Level"
                    value={educationLevelFilter}
                    onChange={(val) => { setEducationLevelFilter(String(val)); setPage(1); }}
                    options={[
                        { label: "All Levels", value: "" },
                        ...eduLevels.map(edu => ({ label: edu.name, value: edu.id }))
                    ]}
                />
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
                  <button onClick={() => handleSort("educationLevel.name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Level <SortIcon column="educationLevel.name" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("programStudy.name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Program Study <SortIcon column="programStudy.name" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading majors...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedMajors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <MajorIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No majors found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />
                        Add your first major
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedMajors.map((major) => (
                  <TableRow key={major.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4"><Badge>{major.code}</Badge></TableCell>
                    <TableCell className="px-5 py-4 font-medium text-gray-900 dark:text-white text-theme-sm">{major.name}</TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="text-theme-sm text-gray-600 dark:text-gray-400">{major.educationLevel?.name || "-"}</span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="text-theme-sm text-gray-600 dark:text-gray-400">{major.programStudy?.name || "-"}</span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <button
                          onClick={() => handleOpenModal(major)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(major.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                        >
                          <TrashBinIcon className="size-4" />
                        </button>
                        <button 
                            onClick={() => handleToggleStatus(major)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${major.isActive ? 'bg-brand-500' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${major.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
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
        className="max-w-xl"
        title={selectedMajor ? "Update Major" : "Register New Major"}
        description="Configure specific study majors and associate them with programs."
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
                form="major-form"
                className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
              >
                {selectedMajor ? "Update" : "Create"}
              </button>
           </div>
        }
      >
          <form id="major-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Major Code (e.g. TKR)</label>
                    <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g. TKR"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        required
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Major Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Teknik Kendaraan Ringan"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CustomSelect
                    label="Education Level"
                    value={formData.educationLevelId || ""}
                    onChange={(val) => setFormData({ ...formData, educationLevelId: Number(val), programStudyId: 0 })}
                    options={eduLevels.map(edu => ({ label: edu.name, value: edu.id }))}
                    placeholder="Select Level"
                />

                <CustomSelect
                    label="Program Study"
                    value={formData.programStudyId || ""}
                    onChange={(val) => setFormData({ ...formData, programStudyId: Number(val) })}
                    options={filteredProgramStudies.map(ps => ({ label: ps.name, value: ps.id }))}
                    placeholder="Select Program"
                    disabled={!formData.educationLevelId}
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Major Status</label>
                <div 
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                        formData.isActive 
                        ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                        : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                    }`}
                >
                    <div className="flex flex-col">
                        <span className={`text-sm font-semibold ${
                            formData.isActive ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                        }`}>
                            {formData.isActive ? "Active Major" : "Inactive Major"}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-500">
                            {formData.isActive ? "Major is available for student registration." : "Major is currently disabled."}
                        </span>
                    </div>
                    <Switch 
                        checked={formData.isActive}
                        onChange={(val) => setFormData({ ...formData, isActive: val })}
                    />
                </div>
            </div>
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Majors;
