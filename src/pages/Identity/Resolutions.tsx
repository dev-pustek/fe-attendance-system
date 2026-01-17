import React, { useState } from "react";
import { 
    useIdentityResolutions, 
    useCreateIdentityResolution,
    useUpdateIdentityResolution,
    useDeleteIdentityResolution,
    useIdentityCaptureLogs 
} from "../../api/hooks/useIdentity";
import { useUsers } from "../../api/hooks/useUsers";
import { IdentityResolution, CreateResolutionDto, IdentityCaptureLog } from "../../api/types/identity";
import { User } from "../../api/types/user";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Badge from "../../components/atoms/Badge";
import Modal from "../../components/molecules/Modal";
import { 
    GridIcon, 
    ChevronLeftIcon, 
    AngleRightIcon, 
    ChevronUpIcon, 
    ChevronDownIcon,
    PlusIcon,
    PencilIcon,
    TrashBinIcon
} from "../../components/atoms/Icons";
import { useDebounce } from "../../hooks/useDebounce";
import CustomSelect from "../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../components/molecules/SearchableAsyncSelect";
import { showSuccess, showError } from "../../utils/toast";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import DatePicker from "../../components/molecules/DatePicker";
import NumberInput from "../../components/atoms/NumberInput";

const IdentityResolutions: React.FC = () => {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const debouncedSearch = useDebounce(searchQuery, 500);
    const [userSearch, setUserSearch] = useState("");

    // CRUD Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedUserLabel, setSelectedUserLabel] = useState("");
    const [formData, setFormData] = useState<Partial<CreateResolutionDto>>({
        captureLogId: "",
        userId: "",
        matchConfidence: 0,
        resolutionStatus: "pending",
        resolutionMethod: "manual",
        resolvedAt: new Date().toISOString().slice(0, 16)
    });

    // Delete dialog
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    const { data: response, isLoading } = useIdentityResolutions({
        page,
        limit,
        search: debouncedSearch,
        resolutionStatus: statusFilter || undefined,
        sortBy: sortConfig?.key,
        sortOrder: sortConfig?.direction
    });

    const { data: usersResponse, isLoading: isUsersLoading } = useUsers({ search: userSearch });
    const { data: logsResponse } = useIdentityCaptureLogs({ limit: 50 }); // For selection

    const { mutate: createResolution, isPending: isCreating } = useCreateIdentityResolution();
    const { mutate: updateResolution, isPending: isUpdating } = useUpdateIdentityResolution();
    const { mutate: deleteResolution, isPending: isDeleting } = useDeleteIdentityResolution();

    const resolutions = response?.data || [];
    const total = Number(response?.meta?.total ?? 0);
    const totalPages = Number(response?.meta?.totalPages ?? Math.ceil(total / limit));

    const userOptions = (usersResponse?.data || []).map((user: User) => ({
        label: `${user.name} (${user.email})`,
        value: user.id || user.public_id
    }));

    const logOptions = (logsResponse?.data || []).map((log: IdentityCaptureLog) => ({
        label: `Log #${log.id} - ${log.rawIdentifier} (${new Date(log.capturedAt).toLocaleString()})`,
        value: log.id
    }));

    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
        return sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="size-3 text-brand-500" />
        ) : (
            <ChevronDownIcon className="size-3 text-brand-500" />
        );
    };

    const handleOpenModal = (res?: IdentityResolution) => {
        if (res) {
            setIsEditMode(true);
            setSelectedId(res.id);
            setSelectedUserLabel(res.user?.name || "");
            setFormData({
                captureLogId: res.captureLogId,
                userId: res.userId,
                matchConfidence: res.matchConfidence,
                resolutionStatus: res.resolutionStatus,
                resolutionMethod: res.resolutionMethod,
                resolvedAt: new Date(res.resolvedAt).toISOString().slice(0, 16)
            });
        } else {
            setIsEditMode(false);
            setSelectedId(null);
            setSelectedUserLabel("");
            setFormData({
                captureLogId: String(logOptions[0]?.value || ""),
                userId: "",
                matchConfidence: 1.0,
                resolutionStatus: "confirmed",
                resolutionMethod: "manual",
                resolvedAt: new Date().toISOString().slice(0, 16)
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            captureLogId: Number(formData.captureLogId),
            matchConfidence: Number(formData.matchConfidence),
            resolvedAt: new Date(formData.resolvedAt || "").toISOString()
        } as CreateResolutionDto;

        if (isEditMode && selectedId) {
            updateResolution({ id: selectedId, data: payload }, {
                onSuccess: () => {
                    showSuccess("Resolution updated successfully");
                    setIsModalOpen(false);
                },
                onError: (error) => showError(error, "Failed to update resolution")
            });
        } else {
            createResolution(payload, {
                onSuccess: () => {
                    showSuccess("Resolution created successfully");
                    setIsModalOpen(false);
                },
                onError: (error) => showError(error, "Failed to create resolution")
            });
        }
    };

    const handleDeleteClick = (id: string) => {
        setIdToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (idToDelete) {
            deleteResolution(idToDelete, {
                onSuccess: () => {
                    showSuccess("Resolution deleted successfully");
                    setIsDeleteDialogOpen(false);
                },
                onError: (error) => showError(error, "Failed to delete resolution")
            });
        }
    };

    return (
        <>
            <PageMeta title="Resolutions | ID Link" description="View identity resolution history." />
            <PageBreadcrumb pageTitle="Resolutions" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Resolutions</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Real-time match results.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                    >
                        <PlusIcon className="size-4" />
                        Manual Resolution
                    </button>
                </div>

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
                                    placeholder="Search resolutions..."
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
                                    { label: "Confirmed", value: "confirmed" },
                                    { label: "Rejected", value: "rejected" },
                                    { label: "Pending", value: "pending" },
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
                                    <button onClick={() => handleSort("resolvedAt")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Resolved At <SortIcon column="resolvedAt" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("user")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        User <SortIcon column="user" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("resolutionMethod")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Method <SortIcon column="resolutionMethod" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("matchConfidence")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Confidence <SortIcon column="matchConfidence" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 uppercase">Status</TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 uppercase text-right">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="py-12 text-center text-gray-400">Loading...</TableCell></TableRow>
                            ) : resolutions.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="py-12 text-center text-gray-400">No resolutions found.</TableCell></TableRow>
                            ) : (
                                resolutions.map((res) => (
                                    <TableRow key={res.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                        <TableCell className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">{new Date(res.resolvedAt).toLocaleString()}</TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                {res.user?.photo && <img src={res.user.photo} className="size-7 rounded-full object-cover border border-gray-100 dark:border-white/10" />}
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{res.user?.name || "Unknown"}</span>
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tighter">ID: {res.captureLog?.rawIdentifier}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                                {res.resolutionMethod}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                                                    <div 
                                                        className={`h-full ${res.matchConfidence > 0.9 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                                                        style={{ width: `${res.matchConfidence * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono dark:text-gray-400">{(res.matchConfidence * 100).toFixed(1)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <Badge color={res.resolutionStatus === 'confirmed' ? 'success' : res.resolutionStatus === 'pending' ? 'warning' : 'error'}>
                                                {res.resolutionStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenModal(res)}
                                                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-brand-500 dark:hover:bg-white/5"
                                                >
                                                    <PencilIcon className="size-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(res.id)} 
                                                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-white/5"
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
                             Showing <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * limit + 1}</span> to <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
                         </p>
                         <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.05] dark:text-gray-400"
                            >
                                <ChevronLeftIcon className="size-4" /> Previous
                            </button>
                            <span className="text-sm font-semibold dark:text-gray-300">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.05] dark:text-gray-400"
                            >
                                Next <AngleRightIcon className="size-4" />
                            </button>
                         </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditMode ? "Edit Resolution" : "Create Manual Resolution"}
                description={isEditMode ? "Modify the resolution details below." : "Manually link a capture log to a specific user."}
                className="max-w-xl"
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
                            form="resolution-form"
                            disabled={isCreating || isUpdating}
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                        >
                            {isCreating || isUpdating ? "Saving..." : isEditMode ? "Update Resolution" : "Create Resolution"}
                        </button>
                    </div>
                }
            >
                <form id="resolution-form" onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5">
                        <CustomSelect
                            label="Initial Capture Log"
                            value={formData.captureLogId || ""}
                            onChange={(val) => setFormData({ ...formData, captureLogId: String(val) })}
                            options={logOptions}
                        />

                        <SearchableAsyncSelect
                            label="Assigned User"
                            placeholder="Search user..."
                            value={formData.userId || ""}
                            onChange={(val) => setFormData({ ...formData, userId: String(val) })}
                            onSearch={(term) => setUserSearch(term)}
                            options={userOptions}
                            isLoading={isUsersLoading}
                            initialLabel={selectedUserLabel}
                        />

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                             <div className="space-y-1.5">
                                <NumberInput
                                    label="Confidence (0.0 - 1.0)"
                                    required
                                    value={formData.matchConfidence ?? ""}
                                    onChange={(val) => setFormData({ ...formData, matchConfidence: val as unknown as number })}
                                />
                            </div>
                            <CustomSelect
                                label="Status"
                                value={formData.resolutionStatus || ""}
                                onChange={(val) => setFormData({ ...formData, resolutionStatus: String(val) })}
                                options={[
                                    { label: "Confirmed", value: "confirmed" },
                                    { label: "Rejected", value: "rejected" },
                                    { label: "Pending", value: "pending" },
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <CustomSelect
                                label="Method"
                                value={formData.resolutionMethod || ""}
                                onChange={(val) => setFormData({ ...formData, resolutionMethod: String(val) })}
                                options={[
                                    { label: "Manual", value: "manual" },
                                    { label: "Automatic", value: "automatic" },
                                    { label: "Verified", value: "verified" },
                                ]}
                            />
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Resolved At</label>
                                <DatePicker
                                    type="datetime"
                                    required
                                    value={formData.resolvedAt || ""}
                                    onChange={(date) => setFormData({ ...formData, resolvedAt: date })}
                                />
                            </div>
                        </div>
                    </div>

                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Resolution Record"
                message="Are you sure you want to delete this resolution record? This may leave the associated capture log in an unresolved state."
                confirmText="Delete Record"
                variant="delete"
                isLoading={isDeleting}
            />
        </>
    );
};

export default IdentityResolutions;
