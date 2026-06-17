import React, { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { useLeaveTypes, useCreateLeaveType, useUpdateLeaveType, useDeleteLeaveType } from "../../../api/hooks/useLeaves";
import { LeaveType } from "../../../api/types/leave";
import { useDebounce } from "../../../hooks/useDebounce";
import { useUsers } from "../../../api/hooks/useUsers";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import Modal from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";
import Switch from "../../../components/atoms/Switch";
import NumberInput from "../../../components/atoms/NumberInput";
import { PlusIcon, GridIcon, DocsIcon, PencilIcon, TrashBinIcon, FilterIcon, ChevronDownIcon, SearchIcon } from "../../../components/atoms/Icons";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";
import ImportModal from "../../../components/molecules/ImportModal";
import { leaveService } from "../../../api/services/leaveService";
import { useIsMobile } from "../../../hooks/useIsMobile";

const LeaveTypes: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const { confirm, confirmState } = useConfirm();
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Data Hooks
    const { data: leaveTypesResponse, isLoading } = useLeaveTypes();
    const createMutation = useCreateLeaveType();
    const updateMutation = useUpdateLeaveType();
    const deleteMutation = useDeleteLeaveType();

    // User Search for Approvers
    const [approverSearchTerm, setApproverSearchTerm] = useState("");
    const { users: fetchedUsers, isLoading: isLoadingUsers } = useUsers({ 
        search: approverSearchTerm, 
        limit: 10 
    });
    const approverOptions = (fetchedUsers || []).map((u: any) => ({
        label: u.name,
        value: u.public_id,
        subLabel: u.email
    }));

    // Modal State
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
    const [formData, setFormData] = useState<{
        displayName: string;
        requiresFile: boolean;
        maxDaysPerYear: number;
        isActive: boolean;
        approvalLevelsRequired: number;
        approvers: { level: number; approverId: string; name?: string }[];
    }>({
        displayName: "",
        requiresFile: false,
        maxDaysPerYear: 12,
        isActive: true,
        approvalLevelsRequired: 1,
        approvers: [],
    });

    const leaveTypes = useMemo(() => {
        if (!leaveTypesResponse) return [];
        // Handle both simple array and paginated response structures if needed
        const types = Array.isArray(leaveTypesResponse) ? leaveTypesResponse : (leaveTypesResponse.data || []);
        
        if (!debouncedSearch) return types;
        
        return types.filter((t: LeaveType) => 
            (t.displayName?.toLowerCase() || "").includes(debouncedSearch.toLowerCase()) || 
            t.code.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [leaveTypesResponse, debouncedSearch]);

    const handleOpenFormModal = (type?: LeaveType) => {
        if (type) {
            setSelectedType(type);
            setFormData({
                displayName: type.displayName || "",
                requiresFile: type.requiresFile,
                maxDaysPerYear: type.maxDaysPerYear,
                isActive: type.isActive,
                approvalLevelsRequired: type.approvalLevelsRequired || 1,
                approvers: (type.approvers || []).map(a => ({
                    level: a.approvalLevel,
                    approverId: a.approverId,
                    name: a.approver?.name || "Unknown User"
                })),
            });
        } else {
            setSelectedType(null);
            setFormData({
                displayName: "",
                requiresFile: false,
                maxDaysPerYear: 12,
                isActive: true,
                approvalLevelsRequired: 1,
                approvers: [],
            });
        }
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedType) {
                await updateMutation.mutateAsync({ public_id: selectedType.public_id, data: formData });
                showSuccess("Leave type updated successfully!");
            } else {
                await createMutation.mutateAsync(formData);
                showSuccess("Leave type created successfully!");
            }
            setIsFormModalOpen(false);
        } catch (error) {
            showError(error, "Failed to save leave type");
        }
    };

    const handleDelete = async (type: LeaveType) => {
        const confirmed = await confirm({
            variant: "delete",
            title: "Delete Leave Type",
            message: `Are you sure you want to delete "${type.displayName || type.code}"? This action cannot be undone.`,
        });

        if (confirmed) {
            try {
                await deleteMutation.mutateAsync(type.public_id);
                showSuccess("Leave type deleted successfully!");
            } catch (error) {
                showError(error, "Failed to delete leave type");
            }
        }
    };

    // --- Export & Import Handlers ---
    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const blob = await leaveService.exportTypesExcel({ search: searchQuery });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `leave-types-${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showSuccess("Exported to Excel successfully!");
        } catch (error) {
            showError(error, "Failed to export Excel");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdf = async () => {
        setIsExporting(true);
        try {
            const blob = await leaveService.exportTypesPdf({ search: searchQuery });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `leave-types-${new Date().toISOString().split("T")[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showSuccess("Exported to PDF successfully!");
        } catch (error) {
            showError(error, "Failed to export PDF");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await leaveService.downloadTypesTemplate(true);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "leave-types-template.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showError(error, "Failed to download template");
        }
    };

    const handleImportClick = () => {
        setIsImportModalOpen(true);
    };

    const handleImport = async (file: File) => {
        setIsImporting(true);
        try {
            const res = await leaveService.importTypes(file);
            showSuccess(`Successfully imported! Created: ${res.data?.created || 0}, Errors: ${res.data?.errors?.length || 0}`);
            
            if (res.data?.errors?.length) {
                console.warn("Import errors:", res.data.errors);
                alert(`Some rows failed to import:\n${res.data.errors.slice(0, 5).join('\n')}${res.data.errors.length > 5 ? '\n...' : ''}`);
            }

            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            setIsImportModalOpen(false);
        } catch (error) {
            showError(error, "Failed to import leave types");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <PageMeta title="Leave Types | SIAPUS" description="Manage leave categories and policies." />
            <PageBreadcrumb pageTitle="Leave Types" />

            <div className="space-y-6">
                {/* Header - Hidden on Mobile */}
                <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Leave Types</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure the types of leave available to your employees.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            size="md"
                            className="rounded-2xl shadow-lg shadow-brand-500/20"
                            onClick={() => handleOpenFormModal()}
                        >
                            <PlusIcon className="size-5" />
                            Create New Type
                        </Button>
                        <DataActionsMenu
                            onExportExcel={handleExportExcel}
                            onExportPdf={handleExportPdf}
                            onDownloadTemplate={handleDownloadTemplate}
                            onImportClick={handleImportClick}
                            isExporting={isExporting}
                            isImporting={isImporting}
                        />
                    </div>
                </div>

                {/* Mobile FAB */}
                {/* Mobile FAB */}
                {isMobile && (
                    <MobileFloatingActions
                        onAdd={() => handleOpenFormModal()}
                        addAriaLabel="Create Leave Type"
                        dataActionsProps={{
                            isExporting,
                            isImporting,
                            onExportExcel: handleExportExcel,
                            onExportPdf: handleExportPdf,
                            onImportClick: handleImportClick,
                            onDownloadTemplate: handleDownloadTemplate
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
                                Find leave types quickly
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
                                
                                <div className="grid grid-cols-1 gap-5 items-end md:grid-cols-3">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search by Code, Name..."
                                                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 md:col-span-1">
                                        <button onClick={() => setSearchQuery("")} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300">
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-3xl bg-gray-50 dark:bg-white/[0.02] animate-pulse"></div>
                        ))}
                    </div>
                ) : leaveTypes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="size-20 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-6">
                            <DocsIcon className="size-10 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">No leave types found</h3>
                        <p className="text-gray-500 max-w-xs mt-2">Start by creating your first leave type like "Annual Leave" or "Sick Leave".</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {leaveTypes.map((type: LeaveType) => (
                            <div key={type.id} className="group relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-6 transition-all duration-300 hover:border-brand-500/30 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 dark:border-white/[0.05] dark:bg-white/[0.02] flex flex-col">
                                {/* Gradient Background Accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-500/10 to-transparent rounded-bl-[4rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                {/* Header Area */}
                                <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform duration-300">
                                            <DocsIcon className="size-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                {type.displayName || type.code}
                                            </h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                {type.code}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-2">
                                        <Switch
                                            checked={type.isActive}
                                            onChange={async (checked) => {
                                                try {
                                                    await updateMutation.mutateAsync({ public_id: type.public_id, data: { isActive: checked } });
                                                    showSuccess(`${type.displayName || type.code} is now ${checked ? 'active' : 'inactive'}`);
                                                } catch (e) { showError(e); }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Tags Area */}
                                <div className="flex flex-wrap items-center gap-2 mb-6 relative z-10">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${type.requiresFile ? 'bg-amber-50 text-amber-600 border border-amber-200/50 dark:bg-amber-500/10 dark:border-amber-500/20' : 'bg-gray-50 text-gray-500 border border-gray-200/50 dark:bg-white/5 dark:border-white/10'}`}>
                                        {type.requiresFile ? 'Proof Required' : 'No Proof Needed'}
                                    </span>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${type.isActive ? 'bg-success-50 text-success-600 border border-success-200/50 dark:bg-success-500/10 dark:border-success-500/20' : 'bg-gray-50 text-gray-500 border border-gray-200/50 dark:bg-white/5 dark:border-white/10'}`}>
                                        {type.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                                    <div className="flex flex-col gap-1 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 dark:bg-white/[0.02] dark:border-white/5 group-hover:bg-brand-50/30 dark:group-hover:bg-brand-500/5 transition-colors duration-300">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Allowance</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-gray-900 dark:text-white">{type.maxDaysPerYear}</span>
                                            <span className="text-xs font-semibold text-gray-500">Days</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 dark:bg-white/[0.02] dark:border-white/5 group-hover:bg-brand-50/30 dark:group-hover:bg-brand-500/5 transition-colors duration-300">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Approval</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-gray-900 dark:text-white">{type.approvalLevelsRequired}</span>
                                            <span className="text-xs font-semibold text-gray-500">{type.approvalLevelsRequired > 1 ? 'Levels' : 'Level'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Approvers Preview */}
                                {type.approvers && type.approvers.length > 0 && (
                                    <div className="mb-6 pt-4 border-t border-gray-100 dark:border-white/5 relative z-10">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Approvers Routing</span>
                                        <div className="flex flex-col gap-2">
                                            {Array.from(new Set(type.approvers.map(a => a.approvalLevel))).sort((a, b) => a - b).map(level => {
                                                const levelApprovers = type.approvers!.filter(a => a.approvalLevel === level);
                                                return (
                                                    <div key={level} className="flex items-start gap-3 bg-gray-50 dark:bg-white/[0.02] p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                                                        <div className="size-6 rounded-full bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                                            {level}
                                                        </div>
                                                        <div className="min-w-0 flex-1 flex flex-wrap gap-1.5">
                                                            {levelApprovers.map(app => (
                                                                <span key={app.id} className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/10 truncate max-w-full">
                                                                    {app.approver?.name || "Unknown"}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3 pt-4 mt-auto border-t border-gray-100 dark:border-white/5 relative z-10">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleOpenFormModal(type)}
                                        size="sm"
                                        className="flex items-center justify-center gap-2 rounded-xl !py-2.5 text-xs font-bold transition-all hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 dark:hover:bg-brand-500/10 dark:hover:border-brand-500/30 dark:hover:text-brand-400"
                                    >
                                        <PencilIcon className="size-3.5" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleDelete(type)}
                                        size="sm"
                                        className="flex items-center justify-center gap-2 rounded-xl !py-2.5 text-xs font-bold !text-error-500 !border-error-500/20 hover:!bg-error-50 dark:hover:!bg-error-500/10 transition-all"
                                    >
                                        <TrashBinIcon className="size-3.5" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

             <Modal 
                isOpen={isFormModalOpen} 
                onClose={() => setIsFormModalOpen(false)} 
                title={selectedType ? 'Update Leave Type' : 'New Leave Type'}
                description="Configure settings for this leave category."
                className="max-w-md"
                footer={
                    <div className="flex justify-end gap-3 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => setIsFormModalOpen(false)}
                            className="flex-1 sm:flex-none rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="leave-type-form"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="flex-1 sm:flex-none rounded-xl shadow-lg shadow-brand-500/20"
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                }
            >
                <form id="leave-type-form" onSubmit={handleFormSubmit} className="space-y-5 p-1">


                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Display Name</label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="e.g. Annual Leave"
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white text-gray-900"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <NumberInput
                                label="Max Days / Year"
                                value={formData.maxDaysPerYear}
                                onChange={(val) => setFormData({ ...formData, maxDaysPerYear: Number(val) })}
                                min={1}
                            />
                            <NumberInput
                                label="Step Logic (Levels)"
                                value={formData.approvalLevelsRequired}
                                onChange={(val) => {
                                    const newLevels = Number(val);
                                    setFormData(prev => {
                                        // Keep existing approvers if level is increased, trim if decreased
                                        const updatedApprovers = [...prev.approvers].filter(a => a.level <= newLevels);
                                        return { ...prev, approvalLevelsRequired: newLevels, approvers: updatedApprovers };
                                    });
                                }}
                                min={1}
                                max={5}
                            />
                        </div>

                        {/* Approval Configuration Section */}
                        {formData.approvalLevelsRequired > 0 && (
                            <div className="space-y-3 pt-2 pb-2">
                                <div className="flex flex-col">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Approval Configuration</h4>
                                    <p className="text-xs text-gray-500">Assign specific personnel to handle each approval step.</p>
                                </div>
                                <div className="space-y-3 bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                    {Array.from({ length: formData.approvalLevelsRequired }).map((_, idx) => {
                                        const level = idx + 1;
                                        const currentApprovers = formData.approvers.filter(a => a.level === level);
                                        
                                        return (
                                            <div key={level} className="flex flex-col gap-2 p-3 bg-white dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5">
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Level {level} Approvers</label>
                                                    <p className="text-[10px] text-gray-400">Anyone in this list can approve this step.</p>
                                                </div>
                                                
                                                {/* Selected Approvers */}
                                                {currentApprovers.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {currentApprovers.map(app => (
                                                            <div key={app.approverId} className="flex items-center gap-1.5 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 px-2.5 py-1 rounded-full text-xs font-medium border border-brand-100 dark:border-brand-500/20">
                                                                <span>{app.name}</span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            approvers: prev.approvers.filter(a => !(a.level === level && a.approverId === app.approverId))
                                                                        }));
                                                                    }}
                                                                    className="hover:bg-brand-200 dark:hover:bg-brand-500/30 p-0.5 rounded-full transition-colors"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <SearchableAsyncSelect
                                                    value=""
                                                    onSearch={(term) => setApproverSearchTerm(term)}
                                                    options={approverOptions.filter((opt: any) => !currentApprovers.some(ca => ca.approverId === opt.value))}
                                                    isLoading={isLoadingUsers}
                                                    placeholder="Search user to add..."
                                                    onChange={(val, label) => {
                                                        if (val) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                approvers: [...prev.approvers, { level, approverId: String(val), name: label }]
                                                            }));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                            formData.requiresFile 
                            ? "border-blue-200 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/10" 
                            : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                        }`}>
                            <div className="flex flex-col">
                                <span className={`text-sm font-semibold ${formData.requiresFile ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                                    {formData.requiresFile ? "File Required" : "No File Needed"}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {formData.requiresFile ? "Employees must upload a document/proof." : "Employees can submit without attachments."}
                                </span>
                            </div>
                            <Switch
                                checked={formData.requiresFile}
                                onChange={(checked) => setFormData({ ...formData, requiresFile: checked })}
                            />
                        </div>

                        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                            formData.isActive 
                            ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                            : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                        }`}>
                            <div className="flex flex-col">
                                <span className={`text-sm font-semibold ${formData.isActive ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                                    {formData.isActive ? "Active Type" : "Inactive Type"}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {formData.isActive ? "Employees can select this leave type." : "This leave type is hidden from selection."}
                                </span>
                            </div>
                            <Switch
                                checked={formData.isActive}
                                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                        </div>

                    </form>
            </Modal>

            <ConfirmDialog {...confirmState} />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Import Leave Types"
                description="Upload an Excel file to bulk import leave types."
                onDownloadTemplate={handleDownloadTemplate}
                onImport={handleImport}
                isImporting={isImporting}
            />
        </>
    );
};

export default LeaveTypes;
