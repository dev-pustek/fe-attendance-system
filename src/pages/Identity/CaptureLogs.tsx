import React, { useState } from "react";
import { 
    useIdentityCaptureLogs, 
    useCreateIdentityCaptureLog,
    useUpdateIdentityCaptureLog,
    useDeleteIdentityCaptureLog,
    useIdentityChannels 
} from "../../api/hooks/useIdentity";
import { useDevices } from "../../api/hooks/useDevices";
import { IdentityCaptureLog, CreateCaptureLogDto } from "../../api/types/identity";
import { Device } from "../../api/types/devices";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Badge from "../../components/atoms/Badge";
import Modal from "../../components/molecules/Modal";
import { 
    GridIcon, 
    ChevronLeftIcon, 
    AngleRightIcon, 
    EyeIcon, 
    ChevronUpIcon, 
    ChevronDownIcon,
    PlusIcon,
    TrashBinIcon,
    PencilIcon,
    CheckCircleIcon
} from "../../components/atoms/Icons";
import { useDebounce } from "../../hooks/useDebounce";
import ResolveLogModal from "./components/ResolveLogModal";
import CustomSelect from "../../components/molecules/CustomSelect";
import { showSuccess, showError } from "../../utils/toast";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import DatePicker from "../../components/molecules/DatePicker";
import NumberInput from "../../components/atoms/NumberInput";

const IdentityCaptureLogs: React.FC = () => {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const debouncedSearch = useDebounce(searchQuery, 500);
    const [selectedLog, setSelectedLog] = useState<IdentityCaptureLog | null>(null);
    const [logToResolve, setLogToResolve] = useState<IdentityCaptureLog | null>(null);

    // CRUD Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<CreateCaptureLogDto>>({
        deviceId: "",
        channelId: 0,
        rawIdentifier: "",
        capturedAt: new Date().toISOString().slice(0, 16),
        confidence: 0,
        captureStatus: "pending",
        payload: {}
    });

    // Dynamic Payload State (Key-Value pairs for JSON editor)
    const [payloadItems, setPayloadItems] = useState<{ key: string; value: string }[]>([]);

    // Delete dialog
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    const { data: response, isLoading } = useIdentityCaptureLogs({
        page,
        limit,
        search: debouncedSearch,
        captureStatus: statusFilter || undefined,
        sortBy: sortConfig?.key,
        sortOrder: sortConfig?.direction
    });

    const { data: channelsResponse } = useIdentityChannels();
    const channels = channelsResponse?.data || [];

    const { data: devicesResponse } = useDevices();
    const devices = (devicesResponse?.data || []) as Device[];

    const { mutate: createLog, isPending: isCreating } = useCreateIdentityCaptureLog();
    const { mutate: updateLog, isPending: isUpdating } = useUpdateIdentityCaptureLog();
    const { mutate: deleteLog, isPending: isDeleting } = useDeleteIdentityCaptureLog();

    const logs = response?.data || [];
    const total = Number(response?.meta?.total ?? 0);
    const totalPages = Number(response?.meta?.totalPages ?? Math.ceil(total / limit));

    const channelOptions = channels.map(c => ({ label: c.name, value: String(c.id) }));
    const deviceOptions = devices.map(d => ({ label: d.deviceName, value: d.public_id }));

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

    const handleOpenModal = (log?: IdentityCaptureLog) => {
        if (log) {
            setIsEditMode(true);
            setSelectedId(log.id);

            // Robust device ID resolution
            let resolvedDeviceId = log.deviceId;
            if (!resolvedDeviceId && log.device && devices.length > 0) {
                 const foundDevice = devices.find(d => d.deviceName === log.device?.deviceName);
                 if (foundDevice) resolvedDeviceId = foundDevice.public_id;
            }

            setFormData({
                deviceId: String(resolvedDeviceId || ""),
                channelId: log.channelId,
                rawIdentifier: log.rawIdentifier,
                capturedAt: new Date(log.capturedAt).toISOString().slice(0, 16),
                confidence: log.confidence,
                captureStatus: log.captureStatus,
                payload: log.payload || {}
            });
             // Parse payload into items for editor
            try {
                const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : (log.payload || {});
                setPayloadItems(Object.entries(payload).map(([key, value]) => ({ key, value: String(value) })));
            } catch {
                setPayloadItems([]);
            }
        } else {
            setIsEditMode(false);
            setSelectedId(null);
            setFormData({
                deviceId: devices[0]?.public_id || "",
                channelId: channels[0]?.id || 0,
                rawIdentifier: "",
                capturedAt: new Date().toISOString().slice(0, 16),
                confidence: 1.0,
                captureStatus: "pending",
                payload: {}
            });
            setPayloadItems([]);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convert payload items back to object
        const payloadObject = payloadItems.reduce((acc, item) => {
            if (item.key.trim()) acc[item.key] = item.value;
            return acc;
        }, {} as Record<string, unknown>);

        const payload = {
            ...formData,
            channelId: Number(formData.channelId),
            deviceId: String(formData.deviceId),
            confidence: Number(formData.confidence),
            capturedAt: new Date(formData.capturedAt || "").toISOString(),
            payload: payloadObject
        } as CreateCaptureLogDto;

        if (isEditMode && selectedId) {
            updateLog({ id: selectedId, data: payload }, {
                onSuccess: () => {
                    showSuccess("Log updated successfully");
                    setIsModalOpen(false);
                },
                onError: (error) => showError(error, "Failed to update log")
            });
        } else {
            createLog(payload, {
                onSuccess: () => {
                    showSuccess("Log created successfully");
                    setIsModalOpen(false);
                },
                onError: (error) => showError(error, "Failed to create log")
            });
        }
    };

    const handleDeleteClick = (id: string) => {
        setIdToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (idToDelete) {
            deleteLog(idToDelete, {
                onSuccess: () => {
                    showSuccess("Log deleted successfully");
                    setIsDeleteDialogOpen(false);
                },
                onError: (error) => showError(error, "Failed to delete log")
            });
        }
    };

    return (
        <>
            <PageMeta title="Capture Logs | ID Link" description="View raw identity capture logs." />
            <PageBreadcrumb pageTitle="Capture Logs" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Capture Logs</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Raw biometric capture data.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                    >
                        <PlusIcon className="size-4" />
                        Create Log
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
                                    placeholder="Search logs..."
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
                                    { label: "Processed", value: "processed" },
                                    { label: "Pending", value: "pending" },
                                    { label: "Failed", value: "failed" },
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
                                    <button onClick={() => handleSort("capturedAt")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Captured At <SortIcon column="capturedAt" />
                                    </button>
                                </TableCell>
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
                                    <button onClick={() => handleSort("confidence")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Confidence <SortIcon column="confidence" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4">
                                    <button onClick={() => handleSort("captureStatus")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                        Status <SortIcon column="captureStatus" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 uppercase text-right">Actions</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="py-12 text-center text-gray-400">Loading...</TableCell></TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="py-12 text-center text-gray-400">No logs found.</TableCell></TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                        <TableCell className="px-5 py-4 text-xs dark:text-gray-400">{new Date(log.capturedAt).toLocaleString()}</TableCell>
                                        <TableCell className="px-5 py-4 text-gray-900 font-medium dark:text-gray-200">{log.device?.deviceName || "Unknown"}</TableCell>
                                        <TableCell className="px-5 py-4 text-gray-600 dark:text-gray-400">{log.channel?.name}</TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                                                    <div 
                                                        className={`h-full ${log.confidence > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                                                        style={{ width: `${log.confidence * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono dark:text-gray-400">{(log.confidence * 100).toFixed(1)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <Badge color={log.captureStatus === 'processed' ? 'success' : 'warning'}>{log.captureStatus}</Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setSelectedLog(log)} 
                                                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-brand-500 dark:hover:bg-white/5"
                                                    title="View Payload"
                                                >
                                                    <EyeIcon className="size-4" />
                                                </button>
                                                
                                                {log.captureStatus !== 'processed' && (
                                                    <button
                                                        onClick={() => setLogToResolve(log)}
                                                        className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-white/5"
                                                        title="Manual Resolution"
                                                    >
                                                        <CheckCircleIcon className="size-4" />
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => handleOpenModal(log)}
                                                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-brand-500 dark:hover:bg-white/5"
                                                >
                                                    <PencilIcon className="size-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(log.id)} 
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

            {/* View Payload Modal */}
            <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} className="max-w-xl" title="Capture Log Payload">
                <div className="space-y-4">
                    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100 dark:bg-white/5 dark:border-white/[0.05]">
                        <pre className="text-xs font-mono overflow-auto max-h-96 dark:text-gray-300">
                            {JSON.stringify(selectedLog?.payload || { message: "No payload data" }, null, 2)}
                        </pre>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 uppercase tracking-wider">
                        <span>Captured: {new Date(selectedLog?.capturedAt || "").toLocaleString()}</span>
                        <span>Confidence: {(selectedLog?.confidence || 0 * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </Modal>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditMode ? "Edit Capture Log" : "Create Capture Log"}
                description={isEditMode ? "Edit the details of the captured log." : "Manually create a new capture log entry."}
                className="max-w-2xl"
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
                            form="capture-log-form"
                            disabled={isCreating || isUpdating}
                            className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50"
                        >
                            {isCreating || isUpdating ? "Saving..." : isEditMode ? "Update Log" : "Create Log"}
                        </button>
                    </div>
                }
            >
                <form id="capture-log-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <CustomSelect
                            label="Device"
                            value={String(formData.deviceId || "")}
                            onChange={(val) => setFormData({ ...formData, deviceId: String(val) })}
                            options={deviceOptions}
                        />
                         <CustomSelect
                            label="Channel"
                            value={String(formData.channelId || "")}
                            onChange={(val) => setFormData({ ...formData, channelId: Number(val) })}
                            options={channelOptions}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Raw Identifier</label>
                            <input
                                type="text"
                                required
                                value={formData.rawIdentifier || ""}
                                onChange={(e) => setFormData({ ...formData, rawIdentifier: e.target.value })}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                                placeholder="e.g. Card ID, License Plate"
                            />
                        </div>
                        <CustomSelect 
                            label="Capture Status"
                            value={String(formData.captureStatus || "pending")}
                            onChange={(val) => setFormData({ ...formData, captureStatus: String(val) })}
                            options={[
                                { label: "Pending", value: "pending" },
                                { label: "Processed", value: "processed" },
                                { label: "Failed", value: "failed" },
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                         <div className="space-y-1.5">
                             <NumberInput
                                label="Confidence (0.0 - 1.0)"
                                required
                                value={formData.confidence ?? ""}
                                onChange={(val) => setFormData({ ...formData, confidence: val as unknown as number })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Captured At</label>
                            <DatePicker
                                type="datetime"
                                required
                                value={formData.capturedAt || ""}
                                onChange={(date) => setFormData({ ...formData, capturedAt: date })}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payload Data</label>
                            <button
                                type="button"
                                onClick={() => setPayloadItems([...payloadItems, { key: "", value: "" }])}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-500 hover:text-brand-600 transition-colors"
                            >
                                <PlusIcon className="size-3" /> Add Field
                            </button>
                        </div>
                        
                        <div className="space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05]">
                            {payloadItems.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 py-3 italic">No payload data defined.</p>
                            ) : (
                                payloadItems.map((item, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <input
                                            type="text"
                                            value={item.key}
                                            onChange={(e) => {
                                                const newItems = [...payloadItems];
                                                newItems[index].key = e.target.value;
                                                setPayloadItems(newItems);
                                            }}
                                            placeholder="Key"
                                            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/5 dark:text-white"
                                        />
                                        <input
                                            type="text"
                                            value={item.value}
                                            onChange={(e) => {
                                                const newItems = [...payloadItems];
                                                newItems[index].value = e.target.value;
                                                setPayloadItems(newItems);
                                            }}
                                            placeholder="Value"
                                            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/5 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setPayloadItems(payloadItems.filter((_, i) => i !== index))}
                                            className="mt-1.5 text-gray-400 hover:text-error-500 transition-colors"
                                        >
                                            <TrashBinIcon className="size-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Manual Resolution Modal */}
            <ResolveLogModal 
                isOpen={!!logToResolve} 
                log={logToResolve} 
                onClose={() => setLogToResolve(null)} 
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Capture Log"
                message="Are you sure you want to delete this capture log? This action is permanent and may affect resolution history."
                confirmText="Delete Log"
                variant="delete"
                isLoading={isDeleting}
            />
        </>
    );
};

export default IdentityCaptureLogs;
