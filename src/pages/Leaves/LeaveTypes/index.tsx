import React, { useState, useMemo } from "react";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { useLeaveTypes, useCreateLeaveType, useUpdateLeaveType, useDeleteLeaveType } from "../../../api/hooks/useLeaves";
import { LeaveType } from "../../../api/types/leave";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import Modal from "../../../components/molecules/Modal";
import Switch from "../../../components/atoms/Switch";
import NumberInput from "../../../components/atoms/NumberInput";
import { PlusIcon, GridIcon, DocsIcon, PencilIcon, TrashBinIcon } from "../../../components/atoms/Icons";

const LeaveTypes: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const { confirm, confirmState } = useConfirm();

    // Data Hooks
    const { data: leaveTypesResponse, isLoading } = useLeaveTypes();
    const createMutation = useCreateLeaveType();
    const updateMutation = useUpdateLeaveType();
    const deleteMutation = useDeleteLeaveType();

    // Modal State
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<LeaveType | null>(null);
    const [formData, setFormData] = useState({
        displayName: "",
        requiresFile: false,
        maxDaysPerYear: 12,
        isActive: true,
        approvalLevelsRequired: 1,
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
            });
        } else {
            setSelectedType(null);
            setFormData({
                displayName: "",
                requiresFile: false,
                maxDaysPerYear: 12,
                isActive: true,
                approvalLevelsRequired: 1,
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

    return (
        <>
            <PageMeta title="Leave Types | Sistem Absen" description="Manage leave categories and policies." />
            <PageBreadcrumb pageTitle="Leave Types" />

            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Leave Types</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure the types of leave available to your employees.</p>
                    </div>
                    <button
                        onClick={() => handleOpenFormModal()}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-brand-600 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-brand-500/25"
                    >
                        <PlusIcon className="size-5" />
                        Create New Type
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-md">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <GridIcon className="size-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search leave types..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-2xl border border-gray-100 bg-white py-3.5 pl-11 pr-4 text-sm font-medium outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-white shadow-sm"
                    />
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
                            <div key={type.id} className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 transition-all hover:border-brand-500/20 hover:shadow-2xl hover:shadow-brand-500/5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                                {/* Status Toggle */}
                                <div className="absolute top-4 right-4 transition-opacity">
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

                                <div className="flex items-start gap-4 mb-6">
                                    <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                        <DocsIcon className="size-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                            {type.displayName || type.code}
                                        </h3>
                                        <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-70">
                                            CODE: {type.code}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                                        <span className={`px-2 py-0.5 rounded-full ${type.requiresFile ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10' : 'bg-gray-50 text-gray-500 dark:bg-white/5'}`}>
                                            {type.requiresFile ? 'File Required' : 'No File Needed'}
                                        </span>
                                        <span className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 px-2 py-0.5 rounded-full">
                                            {type.maxDaysPerYear} Days/Year
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm py-2 px-3 rounded-xl bg-brand-50/30 dark:bg-brand-500/5">
                                        <span className="text-gray-500 font-medium">Approval Levels</span>
                                        <span className="font-bold text-brand-600 dark:text-brand-400">
                                            {type.approvalLevelsRequired} {type.approvalLevelsRequired > 1 ? 'Steps' : 'Step'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm py-2 px-3 rounded-xl bg-gray-50 dark:bg-white/5">
                                        <span className="text-gray-500 font-medium">Status</span>
                                        <span className={`font-bold ${type.isActive ? 'text-green-500' : 'text-gray-400'}`}>
                                            {type.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <button
                                            onClick={() => handleOpenFormModal(type)}
                                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-900 hover:text-white dark:border-white/5 dark:bg-white/5 dark:text-white"
                                        >
                                            <PencilIcon className="size-3.5" />
                                            Edit Details
                                        </button>
                                        <button
                                            onClick={() => handleDelete(type)}
                                            className="flex items-center justify-center gap-2 rounded-xl border border-red-500/10 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-500 hover:text-white dark:bg-red-500/5"
                                        >
                                            <TrashBinIcon className="size-3.5" />
                                            Delete
                                        </button>
                                    </div>
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
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsFormModalOpen(false)}
                            className="rounded-2xl px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="leave-type-form"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="rounded-2xl bg-brand-500 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-brand-500/25 hover:bg-brand-600 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
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
                                onChange={(val) => setFormData({ ...formData, approvalLevelsRequired: Number(val) })}
                                min={1}
                                max={5}
                            />
                        </div>

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
        </>
    );
};

export default LeaveTypes;
