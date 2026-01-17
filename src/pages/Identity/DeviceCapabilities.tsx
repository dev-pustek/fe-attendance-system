import React, { useState } from "react";
import { useDeviceChannelCapabilities, useCreateDeviceChannelCapability, useUpdateDeviceChannelCapability, useDeleteDeviceChannelCapability, useIdentityChannels } from "../../api/hooks/useIdentity";
import { useDevices } from "../../api/hooks/useDevices";
import { DeviceChannelCapability, CreateDeviceChannelCapabilityDto } from "../../api/types/identity";
import { useDebounce } from "../../hooks/useDebounce";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Badge from "../../components/atoms/Badge";
import Modal from "../../components/molecules/Modal";
import CustomSelect from "../../components/molecules/CustomSelect";
import { showSuccess, showError } from "../../utils/toast";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import { PlusIcon, TrashBinIcon, PencilIcon, GridIcon, ChevronLeftIcon, AngleRightIcon, ChevronUpIcon, ChevronDownIcon } from "../../components/atoms/Icons";
import Switch from "../../components/atoms/Switch";


const DeviceCapabilities: React.FC = () => {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDeviceId, setFilterDeviceId] = useState("");
    const [filterChannelId, setFilterChannelId] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
    
    const debouncedSearch = useDebounce(searchQuery, 500);
    const { confirm, confirmState } = useConfirm();

    // Queries
    const { data: capabilitiesResponse, isLoading } = useDeviceChannelCapabilities({
        search: debouncedSearch || undefined,
        deviceId: filterDeviceId || undefined,
        channelId: filterChannelId || undefined,
        page,
        limit,
        sortBy: sortConfig?.key,
        sortOrder: sortConfig?.direction
    });

    const { data: channelsResponse } = useIdentityChannels({ limit: 100, isActive: true });
    const { data: devicesResponse } = useDevices({ limit: 100, isActive: true });

    const capabilities = capabilitiesResponse?.data || [];
    const meta = capabilitiesResponse?.meta;
    const channels = channelsResponse?.data || [];
    const devices = Array.isArray(devicesResponse) ? devicesResponse : (devicesResponse?.data || []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCapability, setSelectedCapability] = useState<DeviceChannelCapability | null>(null);
    const [formData, setFormData] = useState<CreateDeviceChannelCapabilityDto>({
        deviceId: "",
        channelId: 0,
        isEnabled: true
    });

    // Mutations
    const createMutation = useCreateDeviceChannelCapability();
    const updateMutation = useUpdateDeviceChannelCapability();
    const deleteMutation = useDeleteDeviceChannelCapability();

    // Handlers
    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
        setPage(1); // Reset to first page on sort change
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
        return sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="size-3 text-brand-500" />
        ) : (
            <ChevronDownIcon className="size-3 text-brand-500" />
        );
    };

    const handleOpenModal = (capability?: DeviceChannelCapability) => {
        if (capability) {
            setSelectedCapability(capability);
            setFormData({
                deviceId: capability.deviceId,
                channelId: capability.channelId,
                isEnabled: capability.isEnabled
            });
        } else {
            setSelectedCapability(null);
            setFormData({
                deviceId: "",
                channelId: 0,
                isEnabled: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isUpdate = !!selectedCapability;
        const confirmed = await confirm({
            variant: isUpdate ? 'update' : 'create',
            title: isUpdate ? 'Update Capability' : 'Create Capability',
            message: `Are you sure you want to ${isUpdate ? 'update' : 'create'} this capability?`,
        });

        if (!confirmed) return;

        try {
            if (isUpdate && selectedCapability) {
                await updateMutation.mutateAsync({
                    id: selectedCapability.id,
                    data: { 
                        isEnabled: formData.isEnabled,
                        deviceId: formData.deviceId,
                        channelId: formData.channelId
                    }
                });
                showSuccess("Capability updated successfully!");
            } else {
                await createMutation.mutateAsync(formData);
                showSuccess("Capability created successfully!");
            }
            setIsModalOpen(false);
        } catch (error) {
            showError(error, `Failed to ${isUpdate ? 'update' : 'create'} capability`);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = await confirm({
            variant: 'delete',
            title: 'Delete Capability',
            message: 'Are you sure you want to delete this capability association?',
        });

        if (confirmed) {
            try {
                await deleteMutation.mutateAsync(id);
                showSuccess("Capability deleted successfully!");
            } catch (error) {
                showError(error, "Failed to delete capability");
            }
        }
    };

    return (
        <>
            <PageMeta title="Device Capabilities | Identity" description="Manage device channel capabilities" />
            <PageBreadcrumb pageTitle="Device Capabilities" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Capabilities</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage which channels are enabled for each device.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                    >
                        <PlusIcon className="fill-white text-xl text-white" />
                        Add Capability
                    </button>
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
                                    placeholder="Search device or channel..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-48">
                            <CustomSelect
                                label="Filter Device"
                                value={filterDeviceId}
                                onChange={(val) => { setFilterDeviceId(String(val)); setPage(1); }}
                                placeholder="All Devices"
                                options={[
                                    { label: "All Devices", value: "" },
                                    ...devices.map(d => ({ label: d.deviceName, value: d.public_id }))
                                ]}
                            />
                        </div>

                        <div className="w-full sm:w-48">
                            <CustomSelect
                                label="Filter Channel"
                                value={filterChannelId}
                                onChange={(val) => { setFilterChannelId(String(val)); setPage(1); }}
                                placeholder="All Channels"
                                options={[
                                    { label: "All Channels", value: "" },
                                    ...channels.map(c => ({ label: c.name, value: String(c.id) }))
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("device")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Device <SortIcon column="device" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("channel")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Channel <SortIcon column="channel" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("isEnabled")} className="flex items-center justify-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider w-full">
                                        Status <SortIcon column="isEnabled" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-12 text-center text-gray-400">Loading capabilities...</TableCell>
                                </TableRow>
                            ) : capabilities.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-12 text-center text-gray-400">No capabilities found.</TableCell>
                                </TableRow>
                            ) : (
                                capabilities.map((cap) => (
                                    <TableRow key={cap.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <TableCell className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900 dark:text-white text-sm">{cap.device?.deviceName || "Unknown Device"}</span>
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono mt-0.5">
                                                    {cap.device?.location && (
                                                        <>
                                                            <span>{cap.device.location}</span>
                                                            <span className="text-gray-300">•</span>
                                                        </>
                                                    )}
                                                    <span title={cap.deviceId}>{cap.deviceId.substring(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cap.channel?.name || "Unknown Channel"}</span>
                                                {cap.channel?.code && (
                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md border border-gray-200 dark:bg-white/10 dark:border-white/10 dark:text-gray-400 w-fit">
                                                        {cap.channel.code}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-center">
                                            <Badge color={cap.isEnabled ? "success" : "error"}>
                                                {cap.isEnabled ? "Enabled" : "Disabled"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleOpenModal(cap)}
                                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                                                >
                                                    <PencilIcon className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cap.id)}
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

                {/* Pagination */}
                {meta && (meta?.totalPages || 0) > 1 && (
                    <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                             Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                             <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, meta.total)}</span> of{" "}
                             <span className="font-medium text-gray-700 dark:text-white">{meta.total}</span> items
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
                                 <span className="text-sm text-gray-500 dark:text-gray-400">{meta?.totalPages || 1}</span>
                             </div>
                             <button
                                 onClick={() => setPage((p) => Math.min(meta?.totalPages || 1, p + 1))}
                                 disabled={page === (meta?.totalPages || 1)}
                                 className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                             >
                                 Next
                                 <AngleRightIcon className="size-4" />
                             </button>
                        </div>
                     </div>
                )}
            </div>

            {/* Modal */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                className="max-w-md"
                title={selectedCapability ? "Update Capability" : "Create Capability"}
                description="Manage device-channel associations."
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
                            form="capability-form"
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                        >
                            {selectedCapability ? "Update" : "Create"}
                        </button>
                    </div>
                }
            >
                <div>
                    <form id="capability-form" onSubmit={handleSubmit} className="space-y-4">
                        <CustomSelect
                            label="Device"
                            value={formData.deviceId}
                            onChange={(val) => setFormData({ ...formData, deviceId: String(val) })}
                            options={[
                                ...devices.map(d => ({ label: d.deviceName, value: d.public_id }))
                            ]}
                            placeholder="Select Device"
                        />
                        <CustomSelect
                            label="Channel"
                            value={formData.channelId}
                            onChange={(val) => setFormData({ ...formData, channelId: Number(val) })}
                            options={[
                                ...channels.map(c => ({ label: c.name, value: c.id }))
                            ]}
                            placeholder="Select Channel"
                        />
                        
                        <div className="space-y-1.5">
                             <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
                             <div 
                                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                                    formData.isEnabled 
                                    ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                                    : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className={`text-sm font-semibold ${
                                        formData.isEnabled ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                                    }`}>
                                        {formData.isEnabled ? "Capability Enabled" : "Capability Disabled"}
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-500">
                                        {formData.isEnabled ? "This device can process authorizations via this channel." : "Authorization requests from this channel will be rejected."}
                                    </span>
                                </div>
                                <Switch 
                                    checked={formData.isEnabled}
                                    onChange={(val) => setFormData({ ...formData, isEnabled: val })}
                                />
                            </div>
                        </div>

                    </form>
                </div>
            </Modal>

            <ConfirmDialog {...confirmState} />
        </>
    );
};

export default DeviceCapabilities;
