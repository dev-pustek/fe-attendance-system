import React, { useState, useMemo } from "react";
import { useLeaveTypes, useCreateLeaveType, useUpdateLeaveType, useDeleteLeaveType } from "../../../api/hooks/useLeaves";
import { LeaveType } from "../../../api/types/leave";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import Modal from "../../../components/molecules/Modal";
import Switch from "../../../components/atoms/Switch";
import NumberInput from "../../../components/atoms/NumberInput";
import { PlusIcon, GridIcon, PencilIcon, TrashBinIcon, ChevronLeftIcon, AngleRightIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import CustomSelect from "../../../components/molecules/CustomSelect";

const LeaveTypesTab: React.FC = () => {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [statusFilter, setStatusFilter] = useState("");
    
    // Sorting
    // Sorting
    // const [sortConfig, setSortConfig] = useState<{ key: keyof LeaveType; direction: "asc" | "desc" } | null>(null); // Sorting moved to backend or not needed for cards yet

    const { confirm, confirmState } = useConfirm();

    // Data Hooks
    // Assuming backend handles pagination if we pass params, but for now mimicking client-side if needed or simple fetch
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
        return Array.isArray(leaveTypesResponse) ? leaveTypesResponse : (leaveTypesResponse.data || []);
    }, [leaveTypesResponse]);

    // Filtering and Sorting
    const filteredTypes = useMemo(() => {
        let result = [...leaveTypes];

        if (debouncedSearch) {
            const lowerQuery = debouncedSearch.toLowerCase();
            result = result.filter((t: LeaveType) => 
                (t.displayName?.toLowerCase() || "").includes(lowerQuery) || 
                t.code.toLowerCase().includes(lowerQuery)
            );
        }

        if (statusFilter !== "") {
            const isActive = statusFilter === "true";
            result = result.filter((t: LeaveType) => t.isActive === isActive);
        }

        /* if (sortConfig) {
            result.sort((a, b) => {
                const aVal = String(a[sortConfig.key] || "");
                const bVal = String(b[sortConfig.key] || "");
                if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        } */

        return result;
    }, [leaveTypes, debouncedSearch, statusFilter]);

    // Pagination Logic
    const total = filteredTypes.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedTypes = filteredTypes.slice((page - 1) * limit, page * limit);

    /* const handleSort = (key: keyof LeaveType) => {
        // ...
    }; */

    /* const SortIcon = ({ column }: { column: keyof LeaveType }) => {
        // ...
    }; */

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
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                     <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">Leave Definitions</h2>
                     <p className="text-sm text-gray-500 dark:text-gray-400">Manage leave categories and entitlements.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <GridIcon className="size-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search leave types..."
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

            {/* Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
                    ))
                ) : paginatedTypes.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-white/5">
                         <div className="size-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                            <GridIcon className="size-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">No leave types found</p>
                        <p className="text-xs text-gray-500 mt-1 mb-4">Get started by creating a new leave definition.</p>
                        <button
                            onClick={() => handleOpenFormModal()}
                            className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
                        >
                            Create New Type
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Add New Type Card */}
                        <div 
                            onClick={() => handleOpenFormModal()}
                            className="group relative flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/20 p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-brand-500/10 hover:border-brand-500/40 dark:border-brand-500/20 dark:bg-brand-500/[0.02] dark:hover:bg-brand-500/[0.08] dark:hover:border-brand-500/40 cursor-pointer overflow-hidden min-h-[220px]"
                        >
                            {/* Decorative Background Elements */}
                            <div className="absolute -right-6 -top-6 size-32 rounded-full bg-brand-500/5 blur-3xl transition-all group-hover:bg-brand-500/15" />
                            <div className="absolute -left-6 -bottom-6 size-32 rounded-full bg-brand-500/5 blur-3xl transition-all group-hover:bg-brand-500/15" />
                            
                            <div className="relative">
                                <div className="size-16 rounded-2xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-1 ring-brand-100 dark:ring-brand-500/20 group-hover:ring-brand-500/30">
                                    <PlusIcon className="size-8 text-brand-500" />
                                </div>
                            </div>
                            
                            <div className="text-center relative">
                                <span className="text-lg font-bold text-gray-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                    Add New Type
                                </span>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-medium max-w-[180px]">
                                    Define a new leave category
                                </p>
                            </div>
                        </div>

                        {paginatedTypes.map((type: LeaveType) => (
                        <div 
                            key={type.id}
                            className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 overflow-hidden min-h-[220px]"
                        >
                            <div className="p-5 flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                     <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                                            {type.code}
                                        </span>
                                        <Badge color={type.isActive ? 'success' : 'light'} className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                                            {type.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                                        {type.displayName}
                                    </h3>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Entitlement</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{type.maxDaysPerYear} Days / Year</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Approval Steps</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{type.approvalLevelsRequired} Level(s)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Document</span>
                                         {type.requiresFile ? (
                                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                                Required
                                            </span>
                                         ) : (
                                            <span className="text-gray-400 dark:text-white/20">Optional</span>
                                         )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-2">
                                    <Switch 
                                        checked={type.isActive} 
                                        onChange={() => {
                                            if (type.public_id) {
                                                updateMutation.mutateAsync({ public_id: type.public_id, data: { isActive: !type.isActive } });
                                            }
                                        }} 
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleOpenFormModal(type)} 
                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                    >
                                        <PencilIcon className="size-3.5" /> Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(type)} 
                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                    >
                                        <TrashBinIcon className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    </>
                )}
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                  <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                  <span className="font-medium text-gray-700 dark:text-white">{total}</span> types
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
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="leave-type-form"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all disabled:opacity-70"
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                }
            >
                <form id="leave-type-form" onSubmit={handleFormSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                placeholder="e.g. Annual Leave"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 text-gray-900 focus:outline-none"
                                required
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Max Days/Year</label>
                                <NumberInput
                                    value={formData.maxDaysPerYear}
                                    onChange={(val) => setFormData({ ...formData, maxDaysPerYear: Number(val) })}
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1.5">Approval Levels</label>
                                <NumberInput
                                    value={formData.approvalLevelsRequired}
                                    onChange={(val) => setFormData({ ...formData, approvalLevelsRequired: Number(val) })}
                                    min={1}
                                    max={5}
                                />
                            </div>
                        </div>

                        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                            formData.requiresFile 
                            ? "border-blue-200 bg-blue-50/50" 
                            : "border-gray-200 bg-gray-50/50"
                        }`}>
                            <div className="flex flex-col">
                                <span className={`text-sm font-semibold ${formData.requiresFile ? "text-blue-700" : "text-gray-700"}`}>
                                    {formData.requiresFile ? "File Required" : "No File Needed"}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {formData.requiresFile ? "Must upload document." : "No attachment needed."}
                                </span>
                            </div>
                            <Switch
                                checked={formData.requiresFile}
                                onChange={(checked) => setFormData({ ...formData, requiresFile: checked })}
                            />
                        </div>

                        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                            formData.isActive 
                            ? "border-green-200 bg-green-50/50" 
                            : "border-gray-200 bg-gray-50/50"
                        }`}>
                            <div className="flex flex-col">
                                <span className={`text-sm font-semibold ${formData.isActive ? "text-green-700" : "text-gray-700"}`}>
                                    {formData.isActive ? "Active Type" : "Inactive Type"}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {formData.isActive ? "Visible to employees." : "Hidden from selection."}
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
        </div>
    );
};

export default LeaveTypesTab;
