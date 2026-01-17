import React, { useState } from "react";
import { 
    useIdentityCredentials, 
    useDeleteIdentityCredential, 
    useIdentityChannels,
    useCreateIdentityCredential,
    useUpdateIdentityCredential
} from "../../api/hooks/useIdentity";
import { useUsers } from "../../api/hooks/useUsers";
import { IdentityCredential, CreateCredentialDto } from "../../api/types/identity";
import { User } from "../../api/types/user";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Badge from "../../components/atoms/Badge";
import { showSuccess, showError } from "../../utils/toast";
import { 
    GridIcon, 
    ChevronLeftIcon, 
    AngleRightIcon, 
    TrashBinIcon, 
    ChevronUpIcon, 
    ChevronDownIcon,
    PlusIcon,
    PencilIcon
} from "../../components/atoms/Icons";
import { useDebounce } from "../../hooks/useDebounce";
import CustomSelect from "../../components/molecules/CustomSelect";
import Modal from "../../components/molecules/Modal";
import SearchableAsyncSelect from "../../components/molecules/SearchableAsyncSelect";
import Switch from "../../components/atoms/Switch";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import DatePicker from "../../components/molecules/DatePicker";
import NumberInput from "../../components/atoms/NumberInput";

const IdentityCredentials: React.FC = () => {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [channelFilter, setChannelFilter] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<CreateCredentialDto>>({
        userId: "",
        channelId: 0,
        identifierValue: "",
        issuedAt: new Date().toISOString().split('T')[0],
        expiresAt: "",
        isActive: true,
        maxUses: 0
    });

    // Delete Dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    const debouncedSearch = useDebounce(searchQuery, 500);
    const [userSearch, setUserSearch] = useState("");
    const debouncedUserSearch = useDebounce(userSearch, 500);

    const { data: channelsResponse } = useIdentityChannels();
    const channels = channelsResponse?.data || [];

    const { users, isLoading: isUsersLoading } = useUsers({ 
        search: debouncedUserSearch,
        limit: 10
    });

    const { data: response, isLoading } = useIdentityCredentials({
        page,
        limit,
        channelId: channelFilter ? Number(channelFilter) : undefined,
        search: debouncedSearch,
        sortBy: sortConfig?.key,
        sortOrder: sortConfig?.direction
    });
    
    const { mutate: createCredential, isPending: isCreating } = useCreateIdentityCredential();
    const { mutate: updateCredential, isPending: isUpdating } = useUpdateIdentityCredential();
    const { mutate: deleteCredential, isPending: isDeleting } = useDeleteIdentityCredential();

    const credentials = response?.data || [];
    const total = Number(response?.meta?.total ?? 0);
    const totalPages = Number(response?.meta?.totalPages ?? Math.ceil(total / limit));

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

    const handleOpenModal = (cred?: IdentityCredential) => {
        if (cred) {
            setIsEditMode(true);
            setSelectedId(cred.id);
            setFormData({
                userId: cred.userId,
                channelId: cred.channelId,
                identifierValue: cred.identifierValue,
                issuedAt: cred.issuedAt?.split('T')[0] || "",
                expiresAt: cred.expiresAt?.split('T')[0] || "",
                isActive: cred.isActive,
                maxUses: cred.maxUses || 0
            });
        } else {
            setIsEditMode(false);
            setSelectedId(null);
            setFormData({
                userId: "",
                channelId: channels[0]?.id || 0,
                identifierValue: "",
                issuedAt: new Date().toISOString().split('T')[0],
                expiresAt: "",
                isActive: true,
                maxUses: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({
            userId: "",
            channelId: 0,
            identifierValue: "",
            issuedAt: "",
            expiresAt: "",
            isActive: true,
            maxUses: 0
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            channelId: Number(formData.channelId),
            maxUses: formData.maxUses ? Number(formData.maxUses) : undefined
        } as CreateCredentialDto;

        if (isEditMode && selectedId) {
            updateCredential({ id: selectedId, data: payload }, {
                onSuccess: () => {
                    showSuccess("Credential updated successfully");
                    handleCloseModal();
                },
                onError: (error) => showError(error, "Failed to update credential")
            });
        } else {
            createCredential(payload, {
                onSuccess: () => {
                    showSuccess("Credential issued successfully");
                    handleCloseModal();
                },
                onError: (error) => showError(error, "Failed to issue credential")
            });
        }
    };

    const handleDeleteClick = (id: string) => {
        setIdToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (idToDelete) {
            deleteCredential(idToDelete, {
                onSuccess: () => {
                    showSuccess("Credential revoked successfully");
                    setIsDeleteDialogOpen(false);
                },
                onError: (error) => showError(error, "Failed to revoke credential")
            });
        }
    };

    const channelOptions = [
        { label: "All Channels", value: "" },
        ...channels.map(c => ({ label: c.name, value: String(c.id) }))
    ];

    const userOptions = users.map((u: User) => ({
        label: u.name,
        value: u.id || u.public_id,
        subLabel: u.email
    }));

    return (
        <>
            <PageMeta title="Identity Credentials | ID Link" description="Manage user credentials." />
            <PageBreadcrumb pageTitle="Identity Credentials" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credentials</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage issued user credentials.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600"
                    >
                        <PlusIcon className="size-4" />
                        Issue Credential
                    </button>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider pl-1">Search Credentials</label>
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <GridIcon className="size-4" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Find by name or identifier..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-48">
                            <CustomSelect 
                                label="Identity Channel"
                                value={channelFilter}
                                onChange={(val) => { setChannelFilter(String(val)); setPage(1); }}
                                options={channelOptions}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("user")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        User <SortIcon column="user" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("channel")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Channel <SortIcon column="channel" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("identifierValue")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Identifier <SortIcon column="identifierValue" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("isActive")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Status <SortIcon column="isActive" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("createdAt")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Issued <SortIcon column="createdAt" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 uppercase text-right">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="py-12 text-center text-gray-400">Loading...</TableCell></TableRow>
                            ) : credentials.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="py-12 text-center text-gray-400">No credentials found.</TableCell></TableRow>
                            ) : (
                                credentials.map((cred) => (
                                    <TableRow key={cred.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                        <TableCell className="px-5 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{cred.user?.name || "Unknown"}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{cred.user?.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-gray-700 dark:text-gray-300">{cred.channel?.name}</TableCell>
                                        <TableCell className="px-5 py-4">
                                            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400">
                                                {cred.identifierValue}
                                            </code>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <Badge color={cred.isActive ? "success" : "error"}>
                                                {cred.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-gray-500 dark:text-gray-400">{new Date(cred.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenModal(cred)}
                                                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-brand-500 dark:hover:bg-white/5"
                                                >
                                                    <PencilIcon className="size-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(cred.id)} 
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

                 {total > 0 && (
                    <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                         <p className="text-sm text-gray-500 dark:text-gray-400">
                             Showing <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * limit + 1}</span> to <span className="font-medium text-gray-700 dark:text-gray-300">{Math.min(page * limit, total)}</span> of <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span>
                         </p>
                         <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                            >
                                <ChevronLeftIcon className="size-4" /> Previous
                            </button>
                            <span className="text-sm font-semibold dark:text-gray-300">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
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
                onClose={handleCloseModal}
                title={isEditMode ? "Edit Credential" : "Issue New Credential"}
                description={isEditMode ? "Modify existing credential details." : "Issue a new credential to a user."}
                className="max-w-xl"
                footer={
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="credential-form"
                            disabled={isCreating || isUpdating}
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 disabled:opacity-50"
                        >
                            {isCreating || isUpdating ? "Saving..." : isEditMode ? "Update Credential" : "Issue Credential"}
                        </button>
                    </div>
                }
            >
                <form id="credential-form" onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5">
                        <SearchableAsyncSelect
                            label="Select User"
                            placeholder="Search by name or email..."
                            value={formData.userId || ""}
                            onChange={(val) => setFormData({ ...formData, userId: String(val) })}
                            onSearch={(term) => setUserSearch(term)}
                            options={userOptions}
                            isLoading={isUsersLoading}
                            initialLabel={isEditMode ? response?.data.find(c => c.id === selectedId)?.user?.name : undefined}
                        />

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <CustomSelect
                                label="Identity Channel"
                                value={String(formData.channelId || "")}
                                onChange={(val) => setFormData({ ...formData, channelId: Number(val) })}
                                options={channels.map(c => ({ label: c.name, value: String(c.id) }))}
                            />
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Identifier Value
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.identifierValue || ""}
                                    onChange={(e) => setFormData({ ...formData, identifierValue: e.target.value })}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                                    placeholder="e.g. Card UUID, PIN, etc."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Issued At
                                </label>
                                <DatePicker
                                    type="date"
                                    required
                                    value={formData.issuedAt || ""}
                                    onChange={(date) => setFormData({ ...formData, issuedAt: date })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Expires At (Optional)
                                </label>
                                <DatePicker
                                    type="date"
                                    value={formData.expiresAt || ""}
                                    onChange={(date) => setFormData({ ...formData, expiresAt: date })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <NumberInput
                                    label="Max Uses (0 for unlimited)"
                                    value={formData.maxUses || 0}
                                    onChange={(val) => setFormData({ ...formData, maxUses: Number(val) })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
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
                                            {formData.isActive ? "Active Credential" : "Inactive Credential"}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-500">
                                            {formData.isActive ? "This credential can be used for authentication." : "This credential is currently disabled."}
                                        </span>
                                    </div>
                                    <Switch 
                                        checked={formData.isActive || false}
                                        onChange={(val) => setFormData({ ...formData, isActive: val })}
                                    />
                                </div>
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
                title="Revoke Credential"
                message="Are you sure you want to revoke this credential? This action will prevent the user from authenticating using this specific identifier."
                confirmText="Revoke Credential"
                variant="delete"
                isLoading={isDeleting}
            />
        </>
    );
};

export default IdentityCredentials;
