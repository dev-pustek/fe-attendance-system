import React, { useState } from "react";
import { useProgramStudies, useEducationLevels } from "../../../api/hooks/useAcademic";
import { ProgramStudy, CreateProgramStudyDto, UpdateProgramStudyDto } from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, ChevronLeftIcon, AngleRightIcon, ChevronUpIcon, ChevronDownIcon, InfoIcon as ProgramIcon } from "../../../components/atoms/Icons";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import Badge from "../../../components/atoms/Badge";

const ProgramStudies: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [educationLevelFilter, setEducationLevelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useProgramStudies({
    search: debouncedSearch || undefined,
    educationLevelId: educationLevelFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const { data: educationLevelsResp } = useEducationLevels({ limit: 100 });
  const educationLevels = educationLevelsResp?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramStudy | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProgramStudy; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<CreateProgramStudyDto>({
    code: "",
    name: "",
    educationLevelId: 0,
    isActive: true,
  });

  const handleSort = (key: keyof ProgramStudy) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const programs = React.useMemo(() => {
    return response?.data || [];
  }, [response]);
  
  const sortedPrograms = React.useMemo(() => {
    if (!sortConfig) return programs;
    return [...programs].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = String(a[key] ?? "");
      const valB = String(b[key] ?? "");
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [programs, sortConfig]);

  const SortIcon = ({ column }: { column: keyof ProgramStudy }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = Number(response?.meta?.itemCount ?? response?.meta?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.meta?.totalPages ?? 1);

  const handleOpenModal = (program?: ProgramStudy) => {
    if (program) {
      setSelectedProgram(program);
      setFormData({
        code: program.code,
        name: program.name,
        educationLevelId: Number(program.educationLevelId),
        isActive: program.isActive,
      });
    } else {
      setSelectedProgram(null);
      setFormData({
        code: "",
        name: "",
        educationLevelId: 0,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedProgram ? 'update' : 'create',
      title: selectedProgram ? 'Update Program Study' : 'Create Program Study',
      message: `Are you sure you want to ${selectedProgram ? 'update' : 'create'} the program "${formData.name}"?`,
    });

    if (!confirmed) return;

    const payload = {
        ...formData,
        educationLevelId: parseInt(String(formData.educationLevelId), 10),
    };

    try {
      if (selectedProgram) {
        await updateMutation.mutateAsync({ 
          id: selectedProgram.id,
          data: payload as UpdateProgramStudyDto 
        });
        showSuccess(`Program "${formData.name}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(payload as CreateProgramStudyDto);
        showSuccess(`Program "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save program study");
    }
  };

  const handleToggleStatus = (program: ProgramStudy) => {
    updateMutation.mutate({
        id: program.id,
        data: { isActive: !program.isActive }
    }, {
        onSuccess: () => showSuccess(`Program ${program.name} status updated`),
        onError: (err: Error) => showError(err, "Failed to update status")
    });
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Program Study',
      message: 'Are you sure you want to delete this program study? This action cannot be undone.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Program study deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete program study");
      }
    }
  };

  return (
    <>
      <PageMeta title="Program Studies | Visia" description="Manage fields of study and departments." />
      <PageBreadcrumb pageTitle="Program Studies" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Program Studies</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage academic departments and fields of study.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />
            Add Program
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Program</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Name or code..."
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
                onChange={(val: string | number) => { setEducationLevelFilter(String(val)); setPage(1); }}
                options={[
                  { label: "All Levels", value: "" },
                  ...educationLevels.map(level => ({ label: level.name, value: level.id }))
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
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("code")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Code <SortIcon column="code" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Program Name <SortIcon column="name" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                   <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Education Level</span>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading programs...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedPrograms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <ProgramIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No program studies found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />
                        Add your first program
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedPrograms.map((program: ProgramStudy) => (
                  <TableRow key={program.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <Badge>{program.code}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-500">
                          <ProgramIcon className="size-4" />
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{program.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="text-theme-sm text-gray-600 dark:text-gray-400">
                        {program.educationLevel?.name || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <button
                          onClick={() => handleOpenModal(program)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(program.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                        >
                          <TrashBinIcon className="size-4" />
                        </button>
                        <button 
                            onClick={() => handleToggleStatus(program)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${program.isActive ? 'bg-brand-500' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${program.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
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
              <span className="font-medium text-gray-700 dark:text-white">{total}</span>
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
        title={selectedProgram ? "Update Program Study" : "Create New Program Study"}
        description="Enter program details and associated education level."
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
              form="program-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedProgram ? "Update" : "Create"}
            </button>
          </div>
        }
      >
          <form id="program-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Program Code</label>
                    <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g. TI"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Program Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Teknik Informatika"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        required
                    />
                </div>
            </div>

            <CustomSelect
              label="Education Level"
              value={formData.educationLevelId || ""}
              onChange={(val: string | number) => setFormData({ ...formData, educationLevelId: Number(val) })}
              options={educationLevels.map(level => ({ label: level.name, value: level.id }))}
              placeholder="Select Education Level"
            />

            {/* Status Toggle - Matches create channel design */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Program Status</label>
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
                            {formData.isActive ? "Active Program" : "Inactive Program"}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-500">
                            {formData.isActive ? "Program is available for student enrollment." : "Program is currently disabled."}
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

export default ProgramStudies;
