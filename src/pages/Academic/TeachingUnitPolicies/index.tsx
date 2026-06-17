import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  useTeachingUnitPolicies, 
  useAcademicYears,
  useTeachingUnitPoliciesInfinite,
  useImportTeachingUnitPolicies
} from "../../../api/hooks/useAcademic";
import { academicService } from "../../../api/services/academicService";
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
  TimeIcon,
  FilterIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import Label from "../../../components/atoms/Label";
import NumberInput from "../../../components/molecules/NumberInput";
import { useIsMobile } from "../../../hooks/useIsMobile";
import TableToolbar from "../../../components/molecules/TableToolbar";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";
import ImportModal from "../../../components/molecules/ImportModal";
import { useInView } from "react-intersection-observer";
import TeachingUnitPolicyCard from "./TeachingUnitPolicyCard";

const TeachingUnitPolicies: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [academicYearIdFilter, setAcademicYearIdFilter] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const { confirm, confirmState } = useConfirm();
  const isMobile = useIsMobile();

  const { data: response, isLoading: isLoadingDesktop, createMutation, updateMutation, deleteMutation } = useTeachingUnitPolicies({
    academicYearId: academicYearIdFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMobile
  } = useTeachingUnitPoliciesInfinite({
    academicYearId: academicYearIdFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
  });

  const { ref: observerRef, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  // Export / Import states
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const importMutation = useImportTeachingUnitPolicies();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const policies = useMemo(() => {
    if (isMobile) {
        return infiniteData?.pages.flatMap(page => page.data) || [];
    }
    return response?.data || [];
  }, [response, infiniteData, isMobile]);
  
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

  const toggleAll = (checked: boolean) => {
    if (checked) {
        setSelectedIds(new Set(policies.map(p => p.id)));
    } else {
        setSelectedIds(new Set());
    }
  };

  const toggleOne = (id: number | string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
        newSelected.delete(id);
    } else {
        newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

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
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
      } catch (error) {
        showError(error, "Failed to delete policy");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = await confirm({
        variant: 'delete',
        title: 'Delete Selected Policies',
        message: `Are you sure you want to delete ${selectedIds.size} selected policies? This action cannot be undone.`
    });

    if (!confirmed) return;

    try {
        await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)));
        showSuccess(`Successfully deleted ${selectedIds.size} policies`);
        setSelectedIds(new Set());
    } catch (error) {
        showError(error, "Failed to delete some policies");
    }
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Export / Import Handlers
  const handleExportExcel = async () => {
    try {
        setIsExporting(true);
        const blob = await academicService.exportTeachingUnitPoliciesExcel({
            academicYearId: academicYearIdFilter || undefined,
            isActive: statusFilter === "" ? undefined : statusFilter === "true",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TeachingUnitPolicies_Export_${new Date().getTime()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        showError(error, "Failed to export data");
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
        setIsExporting(true);
        const blob = await academicService.exportTeachingUnitPoliciesPdf({
            academicYearId: academicYearIdFilter || undefined,
            isActive: statusFilter === "" ? undefined : statusFilter === "true",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TeachingUnitPolicies_Export_${new Date().getTime()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        showError(error, "Failed to export PDF");
    } finally {
        setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
        setIsExporting(true);
        const blob = await academicService.downloadTeachingUnitPoliciesTemplate(true);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `TeachingUnitPolicies_Template.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        showError(error, "Failed to download template");
    } finally {
        setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSubmit = async (file: File) => {
    try {
        setIsImporting(true);
        const result = await importMutation.mutateAsync(file);
        
        if (result.errors && result.errors.length > 0) {
            showError(
                new Error(`Imported with ${result.errors.length} errors. First error: ${result.errors[0]}`),
                `Successfully imported ${result.created || 0} policies, updated ${result.updated || 0}.`
            );
        } else {
            showSuccess(`Successfully imported ${result.created || 0} policies and updated ${result.updated || 0}.`);
        }

        setIsImportModalOpen(false);
    } catch (error) {
        showError(error, "Failed to import teaching unit policies");
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <>
      <PageMeta title="Teaching Unit Policies | SIAPUS" description="Configure the duration of one teaching unit (JP)." />
      <PageBreadcrumb pageTitle="Teaching Unit Policies" />

      <div className="space-y-6 relative pb-20 sm:pb-0">
        
        {/* Header - Hidden on Mobile */}
        <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Teaching Unit Policies</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Global configuration for how many minutes one "Teaching Unit" (JP) lasts per academic year.</p>
          </div>
          <div className="flex items-center gap-3">
             <DataActionsMenu
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                onDownloadTemplate={handleDownloadTemplate}
                onImportClick={handleImportClick}
                isExporting={isExporting}
                isImporting={isImporting}
             />
             <button
               onClick={() => handleOpenModal()}
               className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
             >
               <PlusIcon className="size-4 fill-current" />
               Add Policy
             </button>
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && (
            <MobileFloatingActions
                onAdd={() => handleOpenModal()}
                addAriaLabel="Add Policy"
                dataActionsProps={{
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onDownloadTemplate: handleDownloadTemplate,
                    onImportClick: handleImportClick,
                    isExporting: isExporting,
                    isImporting: isImporting
                }}
            />
        )}

        {/* Advanced Filter Card */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-white/[0.05] dark:bg-white/[0.02]">
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <FilterIcon className="size-5 text-brand-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                            Search & Filter
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Filter policies by academic year and status
                    </p>
                </div>
                <div className="shrink-0 ml-4">
                    <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
                </div>
            </button>
            
            <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}>
                <div className="overflow-hidden min-h-0">
                    <div className="px-5 pb-5">
                        <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
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
                </div>
            </div>
        </div>

        {/* Content Area */}
        {isMobile ? (
            <div className="space-y-4">
                {selectedIds.size > 0 && (
                    <div className="sticky top-4 z-20 mx-auto w-[90%] max-w-sm rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-lg backdrop-blur-sm dark:border-white/[0.08] dark:bg-gray-900/90">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                {selectedIds.size} Selected
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-1.5 rounded-lg bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-100 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
                                >
                                    <TrashBinIcon className="size-3.5" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {isLoadingMobile ? (
                     <div className="flex justify-center py-8">
                         <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500"></div>
                     </div>
                ) : sortedPolicies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                         <div className="size-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-4">
                             <BoxIcon className="size-8 text-gray-300 dark:text-gray-600" />
                         </div>
                         <h3 className="text-lg font-bold text-gray-900 dark:text-white">No policies found</h3>
                         <p className="text-sm text-gray-500 mt-1 max-w-[250px]">Adjust your filters or create a new policy to get started.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {sortedPolicies.map((policy) => (
                            <TeachingUnitPolicyCard
                                key={policy.id}
                                policy={policy}
                                isSelected={selectedIds.has(policy.id)}
                                onSelect={toggleOne}
                                onEdit={handleOpenModal}
                                onDelete={(policy) => handleDelete(policy.id)}
                            />
                        ))}
                    </div>
                )}
                <div ref={observerRef} className="h-10 w-full flex items-center justify-center">
                    {isFetchingNextPage && <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>}
                </div>
            </div>
        ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
                <TableToolbar
                    selectedCount={selectedIds.size}
                    onClearSelection={() => setSelectedIds(new Set())}
                    onBulkDelete={handleBulkDelete}
                />
                <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                        <TableCell isHeader className="px-5 py-4 w-12 text-center">
                            <Checkbox 
                                checked={sortedPolicies.length > 0 && selectedIds.size === sortedPolicies.length}
                                onChange={toggleAll}
                            />
                        </TableCell>
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
                    {isLoadingDesktop ? (
                        <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                            <div className="flex flex-col items-center gap-3">
                            <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                            <span className="text-sm">Loading policies...</span>
                            </div>
                        </TableCell>
                        </TableRow>
                    ) : sortedPolicies.length === 0 ? (
                        <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-gray-400">
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
                        <TableRow key={policy.id} className={`group transition-colors ${selectedIds.has(policy.id) ? "bg-brand-50/40 dark:bg-brand-500/5" : "hover:bg-gray-50/50 dark:hover:bg-white/[0.01]"}`}>
                            <TableCell className="px-5 py-4 text-center">
                                <Checkbox 
                                    checked={selectedIds.has(policy.id)}
                                    onChange={() => toggleOne(policy.id)}
                                />
                            </TableCell>
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
        )}

        {/* Desktop Pagination */}
        {!isMobile && total > 0 && (
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

      {/* Modals */}
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

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportSubmit}
        isImporting={isImporting}
        title="Import Teaching Unit Policies"
        description="Upload an Excel file containing teaching unit policies data."
        downloadTemplateText="Download Policy Template"
        onDownloadTemplate={handleDownloadTemplate}
      />

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default TeachingUnitPolicies;
