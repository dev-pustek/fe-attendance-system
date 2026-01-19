import React, { useState, useMemo } from "react";
import { 
  useTeachingUnitPolicies, 
  useAcademicYears 
} from "../../../api/hooks/useAcademic";
import { 
  TeachingUnitPolicy, 
  CreateTeachingUnitPolicyDto, 
  UpdateTeachingUnitPolicyDto 
} from "../../../api/types/academic";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { 
  PencilIcon, 
  TrashBinIcon, 
  PlusIcon, 
  BoxIcon, 
  ChevronLeftIcon, 
  AngleRightIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  CalenderIcon,
  TimeIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import Label from "../../../components/atoms/Label";
import NumberInput from "../../../components/molecules/NumberInput";

const TeachingUnitPolicies: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [academicYearIdFilter, setAcademicYearIdFilter] = useState("");
  
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useTeachingUnitPolicies({
    academicYearId: academicYearIdFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const { data: yearsRes } = useAcademicYears({ limit: 100 });

  const academicYearOptions = (yearsRes?.data || []).map(y => ({
    label: y.code,
    value: y.id
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<TeachingUnitPolicy | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<CreateTeachingUnitPolicyDto>({
    academicYearId: "",
    minutesPerUnit: 45,
    isActive: true,
  });

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const policies = useMemo(() => {
    return response?.data || [];
  }, [response]);
  
  const sortedPolicies = useMemo(() => {
    if (!sortConfig) return policies;
    return [...policies].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number = "";
      let valB: string | number = "";

      if (key === "academicYear") {
        valA = a.academicYear?.code || "";
        valB = b.academicYear?.code || "";
      } else {
        valA = String((a as unknown as Record<string, unknown>)[key] ?? "");
        valB = String((b as unknown as Record<string, unknown>)[key] ?? "");
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [policies, sortConfig]);

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

  const handleOpenModal = (policy?: TeachingUnitPolicy) => {
    if (policy) {
      setSelectedPolicy(policy);
      setFormData({
        academicYearId: policy.academicYearId,
        minutesPerUnit: policy.minutesPerUnit,
        isActive: policy.isActive,
      });
    } else {
      setSelectedPolicy(null);
      setFormData({
        academicYearId: "",
        minutesPerUnit: 45,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.academicYearId || !formData.minutesPerUnit) {
        showError("Please select academic year and minutes per unit");
        return;
    }

    const confirmed = await confirm({
      variant: selectedPolicy ? 'update' : 'create',
      title: selectedPolicy ? 'Update Policy' : 'Create Policy',
      message: `Are you sure you want to ${selectedPolicy ? 'update' : 'create'} this teaching unit policy?`,
    });

    if (!confirmed) return;

    try {
      if (selectedPolicy) {
        await updateMutation.mutateAsync({ 
          id: selectedPolicy.id,
          data: formData as UpdateTeachingUnitPolicyDto 
        });
        showSuccess(`Policy updated successfully!`);
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess(`Policy created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save policy");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Policy',
      message: 'Are you sure you want to remove this teaching unit policy? This action cannot be undone.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Policy deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete policy");
      }
    }
  };

  return (
    <>
      <PageMeta title="Teaching Unit Policies | Visia" description="Configure the duration of one teaching unit (JP)." />
      <PageBreadcrumb pageTitle="Teaching Unit Policies" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teaching Unit Policies</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Global configuration for how many minutes one "Teaching Unit" (JP) lasts per academic year.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="size-4 fill-current" />
            Add Policy
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-100 dark:border-white/[0.05]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-2xl">
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
                  <button onClick={() => handleSort("academicYear")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Academic Year <SortIcon column={"academicYear"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Minutes per JP</TableCell>
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
                      <span className="text-sm">Loading policies...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedPolicies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <BoxIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No teaching unit policies found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="size-3" />
                        Create your first policy
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedPolicies.map((policy: TeachingUnitPolicy) => (
                  <TableRow key={policy.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                          <CalenderIcon className="size-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{policy.academicYear?.code || "Unknown Year"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{policy.academicYear?.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center">
                         <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                            <TimeIcon className="size-3.5 text-brand-500" />
                            <span className="text-theme-sm">{policy.minutesPerUnit} Minutes</span>
                         </div>
                         <span className="text-[10px] text-gray-500 uppercase tracking-tighter self-center">Duration per Unit</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge color={policy.isActive ? "success" : "error"}>
                        {policy.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(policy)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(policy.id)}
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
               <span className="font-medium text-gray-700 dark:text-white">{total}</span> policies
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
        title={selectedPolicy ? "Update Teaching Unit Policy" : "Create Teaching Unit Policy"}
        description="Configure how many minutes one teaching unit (JP) lasts for the selected academic year."
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
              form="teaching-unit-policy-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedPolicy ? "Update Policy" : "Create Policy"}
            </button>
          </div>
        }
      >
          <form id="teaching-unit-policy-form" onSubmit={handleSubmit} className="space-y-4">
            <CustomSelect
                label="Academic Year"
                placeholder="Select year..."
                value={formData.academicYearId}
                onChange={(val) => setFormData({ ...formData, academicYearId: val })}
                options={academicYearOptions}
            />

            <NumberInput
                label="Minutes per Unit (JP)"
                placeholder="Enter duration (e.g. 45)"
                value={formData.minutesPerUnit}
                onChange={(val) => setFormData({ ...formData, minutesPerUnit: val })}
                required
            />

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Active Status</Label>
                <p className="text-xs text-gray-500">Enable or disable this policy.</p>
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

export default TeachingUnitPolicies;
