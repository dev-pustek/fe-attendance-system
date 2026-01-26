import React, { useState } from "react";
import { useIdentityChannels, useCreateIdentityChannel, useUpdateIdentityChannel, useDeleteIdentityChannel } from "../../api/hooks/useIdentity";
import { IdentityChannel, CreateChannelDto } from "../../api/types/identity";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { useDebounce } from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../utils/toast";
import Badge from "../../components/atoms/Badge";
import { GridIcon, SearchIcon, ChevronLeftIcon, AngleRightIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, PencilIcon, TrashBinIcon, UserCircleIcon, BoltIcon, LockIcon, PlugInIcon } from "../../components/atoms/Icons";
import CustomSelect from "../../components/molecules/CustomSelect";
import Modal from "../../components/molecules/Modal";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import Switch from "../../components/atoms/Switch";

const IdentityChannels: React.FC = () => {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof IdentityChannel; direction: "asc" | "desc" } | null>(null);
    
    const debouncedSearch = useDebounce(searchQuery, 500);
    const { confirm, confirmState } = useConfirm();

    // Selection State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { data: response, isLoading } = useIdentityChannels({
        page,
        limit,
        search: debouncedSearch,
        isActive: statusFilter === "" ? undefined : statusFilter === "true",
        sortBy: sortConfig?.key,
        sortOrder: sortConfig?.direction
    });

    const createMutation = useCreateIdentityChannel();

    const updateMutation = useUpdateIdentityChannel();
    const deleteMutation = useDeleteIdentityChannel();

    const channels = response?.data || [];
    const total = Number(response?.meta?.total ?? 0);
    const totalPages = Number(response?.meta?.totalPages ?? Math.ceil(total / limit));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState<IdentityChannel | null>(null);
    const [formData, setFormData] = useState<CreateChannelDto>({
        code: "",
        name: "",
        requiresDevice: false,
        isBiometric: false,
        isActive: true
    });

    const handleSort = (key: keyof IdentityChannel) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }: { column: keyof IdentityChannel }) => {
        if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
        return sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="size-3 text-brand-500" />
        ) : (
            <ChevronDownIcon className="size-3 text-brand-500" />
        );
    };

    const handleOpenModal = (channel?: IdentityChannel) => {
        if (channel) {
            setSelectedChannel(channel);
            setFormData({
                code: channel.code as string,
                name: channel.name,
                requiresDevice: channel.requiresDevice,
                isBiometric: channel.isBiometric,
                isActive: channel.isActive
            });
        } else {
            setSelectedChannel(null);
            setFormData({
                code: "",
                name: "",
                requiresDevice: false,
                isBiometric: false,
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isUpdate = !!selectedChannel;

        const confirmed = await confirm({
            variant: isUpdate ? 'update' : 'create',
            title: isUpdate ? 'Update Channel' : 'Create Channel',
            message: `Are you sure you want to ${isUpdate ? 'update' : 'create'} this channel?`,
        });

        if (!confirmed) return;

        try {
            if (isUpdate && selectedChannel) {
                await updateMutation.mutateAsync({
                    id: selectedChannel.id,
                    data: formData
                });
                showSuccess(`Channel ${formData.name} updated successfully!`);
            } else {
                await createMutation.mutateAsync(formData);
                showSuccess("Channel created successfully!");
            }
            setIsModalOpen(false);
        } catch (error) {
            showError(error, `Failed to ${isUpdate ? 'update' : 'create'} channel`);
        }
    };

    const handleToggleChannel = (channel: IdentityChannel) => {
        updateMutation.mutate({ 
            id: channel.id, 
            data: { isActive: !channel.isActive } 
        }, {
            onSuccess: () => showSuccess(`Channel ${channel.name} updated`),
            onError: () => showError(new Error("Failed"), "Failed to update channel")
        });
    };

    const handleDelete = async (id: number) => {
        const confirmed = await confirm({
            variant: 'delete',
            title: 'Delete Channel',
            message: 'Are you sure you want to delete this channel? This action cannot be undone.',
        });

        if (confirmed) {
            try {
                await deleteMutation.mutateAsync(id);
                showSuccess("Channel deleted successfully!");
            } catch (error) {
                showError(error, "Failed to delete channel");
            }
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(channels.map((c: IdentityChannel) => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        const confirmed = await confirm({
            variant: 'delete',
            title: 'Bulk Delete Channels',
            message: `Are you sure you want to permanently delete ${selectedIds.length} selected channels? This action cannot be undone.`,
            confirmText: `Delete ${selectedIds.length} Channels`
        });

        if (confirmed) {
            try {
                const promises = selectedIds.map(id => deleteMutation.mutateAsync(id));
                await Promise.all(promises);
                showSuccess(`Successfully removed ${selectedIds.length} channels.`);
                setSelectedIds([]);
            } catch (error) {
                showError(error, "Failed to remove some channels");
            }
        }
    };

    return (
        <>
            <PageMeta title="Identity Channels | ID Link" description="Manage authentication channels." />
            <PageBreadcrumb pageTitle="Identity Channels" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identity Channels</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure authentication methods.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                    >
                        <PlusIcon className="fill-white text-xl text-white" />
                        Add Channel
                    </button>
                </div>

                {/* Bulk Selection Actions Bar */}
                {selectedIds.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm font-mono">
                        {selectedIds.length}
                      </div>
                      <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Channels Selected</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-error-50 dark:bg-error-500/10 border border-error-100 dark:border-error-500/20 rounded-xl text-sm font-bold text-error-600 dark:text-error-400 hover:bg-error-100 transition-all shadow-sm"
                        >
                            <TrashBinIcon className="size-4" />
                            Delete Selected
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                  </div>
                )}

                {/* Filters & Actions */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2 px-1">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                checked={channels.length > 0 && selectedIds.length === channels.length}
                                onChange={handleSelectAll}
                            />
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Select All</span>
                        </div>
                        <div className="relative flex-1 max-w-sm">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <SearchIcon className="size-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search channels..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                            />
                        </div>

                        <div className="w-full sm:w-48">
                            <CustomSelect
                                value={statusFilter}
                                onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
                                options={[
                                    { label: "All Status", value: "" },
                                    { label: "Active Only", value: "true" },
                                    { label: "Inactive Only", value: "false" },
                                ]}
                                placeholder="Filter Status"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <CustomSelect
                                value={sortConfig?.key || "id"}
                                onChange={(val) => handleSort(val as keyof IdentityChannel)}
                                options={[
                                    { label: "ID", value: "id" },
                                    { label: "Name", value: "name" },
                                    { label: "Code", value: "code" },
                                ]}
                                className="w-44"
                                placeholder="Sort by..."
                            />
                            {sortConfig && (
                                <button
                                    onClick={() => setSortConfig(prev => prev ? { ...prev, direction: prev.direction === "asc" ? "desc" : "asc" } : null)}
                                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/5 transition-colors"
                                    title={`Sort ${sortConfig.direction === "asc" ? "Descending" : "Ascending"}`}
                                >
                                    <div className="size-4">
                                        <SortIcon column={sortConfig.key} />
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Card Grid View */}
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="size-12 rounded-xl bg-gray-100 dark:bg-white/5"></div>
                                    <div className="h-5 w-16 bg-gray-100 dark:bg-white/5 rounded-full"></div>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-4 w-3/4 bg-gray-100 dark:bg-white/5 rounded"></div>
                                    <div className="h-3 w-1/2 bg-gray-100 dark:bg-white/5 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : channels.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white py-24 text-center dark:border-white/[0.05] dark:bg-white/[0.03]">
                        <div className="flex flex-col items-center gap-3">
                            <div className="size-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-2">
                                <GridIcon className="size-8 text-gray-400 opacity-20" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Channels Found</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">We couldn't find any identity channels matching your search criteria.</p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center gap-2 text-brand-500 hover:text-brand-600 font-bold text-sm mt-4 hover:underline"
                            >
                                <PlusIcon className="size-4" />
                                Add Your First Channel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {channels.map((channel: IdentityChannel) => (
                            <div
                                key={channel.id}
                                className={`group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-xl hover:border-brand-500/40 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/40 overflow-hidden ${selectedIds.includes(channel.id) ? 'ring-2 ring-brand-500 border-brand-500/50 bg-brand-50/10' : ''}`}
                            >
                                <div className="absolute top-3 right-3 z-10">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                        checked={selectedIds.includes(channel.id)}
                                        onChange={() => handleSelectRow(channel.id)}
                                    />
                                </div>
                                <div className="p-5 flex flex-col gap-5">
                                    {/* Top Header: Code & Status */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-widest">{String(channel.code)}</span>
                                            <div className="flex items-center gap-1.5">
                                                <Badge color={channel.isActive ? 'success' : 'light'} className="px-1.5 py-0 text-[9px] uppercase tracking-wider font-semibold rounded-full whitespace-nowrap">
                                                    {channel.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-tight">
                                            {channel.name}
                                        </h3>
                                    </div>

                                    {/* Feature Blocks - Smaller labels */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-tight transition-colors ${
                                            channel.isBiometric 
                                            ? "bg-blue-50/50 border-blue-100 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400" 
                                            : "bg-gray-50/50 border-gray-100 text-gray-500 dark:bg-white/5 dark:border-white/5 dark:text-gray-400"
                                        }`}>
                                            {channel.isBiometric ? <UserCircleIcon className="size-3.5" /> : <BoltIcon className="size-3.5" />}
                                            {channel.isBiometric ? "Biometric Auth" : "Standard Auth"}
                                        </div>
                                        
                                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-tight transition-colors ${
                                            channel.requiresDevice 
                                            ? "bg-purple-50/50 border-purple-100 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400" 
                                            : "bg-gray-50/50 border-gray-100 text-gray-500 dark:bg-white/5 dark:border-white/5 dark:text-gray-400"
                                        }`}>
                                            {channel.requiresDevice ? <LockIcon className="size-3" /> : <PlugInIcon className="size-3" />}
                                            {channel.requiresDevice ? "Device Locked" : "Cross-Device"}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions - Education Level Style */}
                                <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Switch 
                                            checked={channel.isActive}
                                            onChange={() => handleToggleChannel(channel)}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(channel); }}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                            title="Edit Channel"
                                        >
                                            <PencilIcon className="size-3.5" /> Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(channel.id); }}
                                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                            title="Delete Channel"
                                        >
                                            <TrashBinIcon className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination (Client Side) */}
                {total > 0 && (
                    <div className="flex flex-col gap-4 px-2 pt-8 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 dark:border-white/[0.05]">
                         <p className="text-sm text-gray-500 dark:text-gray-400">
                             Showing <span className="font-bold text-gray-900 dark:text-white">{(page - 1) * limit + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">{Math.min(page * limit, total)}</span> of <span className="font-bold text-gray-900 dark:text-white">{total}</span> channels
                         </p>
                         <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400"
                            >
                                <ChevronLeftIcon className="size-4" /> Previous
                            </button>
                            <div className="flex items-center justify-center min-w-[3rem] h-10 rounded-xl bg-gray-50 dark:bg-white/5 text-sm font-bold text-brand-600 dark:text-brand-400">
                                {page} / {totalPages}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400"
                            >
                                Next <AngleRightIcon className="size-4" />
                            </button>
                         </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                className="max-w-xl"
                title={selectedChannel ? "Update Channel" : "New Channel"}
                description={selectedChannel ? "Modify existing identity channel settings." : "Define a new authentication method for the system."}
                footer={
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="channel-form"
                            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                        >
                            {selectedChannel ? "Update Channel" : "Save Channel"}
                        </button>
                    </div>
                }
            >
                <form id="channel-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-normal uppercase text-gray-500 tracking-wider">Channel Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Face Recognition"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                                required
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-normal uppercase text-gray-500 tracking-wider">Channel Code</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="e.g. FACE"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                                required
                            />
                        </div>
                    </div>

                    {/* Configurations Stack */}
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Requires Device Toggle */}
                            <div className="space-y-1.5 h-full">
                                <label className="text-xs font-normal uppercase text-gray-500 tracking-wider">Device Requirement</label>
                                <div 
                                    className={`flex h-[calc(100%-1.5rem)] flex-col justify-between gap-3 rounded-xl border px-4 py-3 transition-all ${
                                        formData.requiresDevice 
                                        ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                                        : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex flex-col pr-2">
                                            <span className={`text-sm font-semibold ${
                                                formData.requiresDevice ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                                            }`}>
                                                {formData.requiresDevice ? "Device Required" : "No Device Required"}
                                            </span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 leading-tight">
                                                {formData.requiresDevice ? "Must be linked to a specific physical device." : "Can be used without a specific device."}
                                            </span>
                                        </div>
                                        <Switch 
                                            checked={formData.requiresDevice}
                                            onChange={(val) => setFormData({ ...formData, requiresDevice: val })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Biometric Toggle */}
                            <div className="space-y-1.5 h-full">
                                <label className="text-xs font-normal uppercase text-gray-500 tracking-wider">Credential Type</label>
                                <div 
                                    className={`flex h-[calc(100%-1.5rem)] flex-col justify-between gap-3 rounded-xl border px-4 py-3 transition-all ${
                                        formData.isBiometric 
                                        ? "border-blue-200 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/10" 
                                        : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex flex-col pr-2">
                                            <span className={`text-sm font-semibold ${
                                                formData.isBiometric ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                                            }`}>
                                                {formData.isBiometric ? "Biometric Enabled" : "Standard Credential"}
                                            </span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 leading-tight">
                                                {formData.isBiometric ? "Uses biometric data like face or fingerprint." : "Uses text-based credentials (e.g. Card ID)."}
                                            </span>
                                        </div>
                                        <Switch 
                                            checked={formData.isBiometric}
                                            onChange={(val) => setFormData({ ...formData, isBiometric: val })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Toggle */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-normal uppercase text-gray-500 tracking-wider">Channel Status</label>
                            <div 
                                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                                    formData.isActive 
                                    ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                                    : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${
                                        formData.isActive ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                                    }`}>
                                        {formData.isActive ? "Active Channel" : "Inactive Channel"}
                                    </span>
                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-tight">
                                        {formData.isActive ? "Globally available for authentication" : "Disabled across the entire system"}
                                    </span>
                                </div>
                                <Switch 
                                    checked={formData.isActive}
                                    onChange={(val) => setFormData({ ...formData, isActive: val })}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog {...confirmState} />
        </>
    );
};

export default IdentityChannels;
