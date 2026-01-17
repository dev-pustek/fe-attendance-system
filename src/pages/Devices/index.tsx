import React, { useState } from "react";
import { useDevices } from "../../api/hooks/useDevices";
import { Device, CreateDeviceDto, UpdateDeviceDto } from "../../api/types/devices";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Modal from "../../components/molecules/Modal";
import CustomSelect from "../../components/molecules/CustomSelect";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, ChevronLeftIcon, AngleRightIcon, VideoIcon, InfoIcon as MapPinIcon, ChevronUpIcon, ChevronDownIcon } from "../../components/atoms/Icons";
import { useDebounce } from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../utils/toast";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import Switch from "../../components/atoms/Switch";

const Devices: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  // const [typeFilter, setTypeFilter] = useState(""); // Removed type filter
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useDevices({
    search: debouncedSearch || undefined,
    // deviceType: typeFilter || undefined, // Removed parameter
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Device; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<Partial<Device>>({
    deviceName: "",
    ipAddress: "",
    location: "",
    isActive: true,
  });
  const [configItems, setConfigItems] = useState<{ key: string; value: string }[]>([]);

  const handleSort = (key: keyof Device) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const devices = React.useMemo(() => {
    return Array.isArray(response) ? response : (response?.data || []);
  }, [response]);
  
  const sortedDevices = React.useMemo(() => {
    if (!sortConfig) return devices;
    return [...devices].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = String(a[key] ?? "");
      const valB = String(b[key] ?? "");
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [devices, sortConfig]);

  const SortIcon = ({ column }: { column: keyof Device }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };
  const total = Number(response?.meta?.total ?? response?.total ?? (Array.isArray(response) ? response.length : 0));
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const handleOpenModal = (device?: Device) => {
    if (device) {
      setSelectedDevice(device);
      setFormData({
        deviceName: device.deviceName,
        ipAddress: device.ipAddress || "",
        location: device.location || "",
        isActive: device.isActive,
      });
      // Parse config into items
      try {
        const config = typeof device.config === 'string' ? JSON.parse(device.config) : (device.config || {});
        setConfigItems(Object.entries(config).map(([key, value]) => ({ key, value: String(value) })));
      } catch {
        setConfigItems([]);
      }
    } else {
      setSelectedDevice(null);
      setFormData({
        deviceName: "",
        ipAddress: "",
        location: "",
        isActive: true,
      });
      setConfigItems([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedDevice ? 'update' : 'create',
      title: selectedDevice ? 'Update Device' : 'Create Device',
      message: `Are you sure you want to ${selectedDevice ? 'update' : 'create'} the device "${formData.deviceName}"?`,
    });

    if (!confirmed) return;

    try {
      // Convert config items directly to object (not JSON string)
      const configObject = configItems.reduce((acc, item) => {
        if (item.key.trim()) acc[item.key] = item.value;
        return acc;
      }, {} as Record<string, string>);

      if (selectedDevice) {
        await updateMutation.mutateAsync({ 
          id: selectedDevice.public_id, // Use public_id
          data: {
            ...formData,
            config: configObject
          } as UpdateDeviceDto 
        });
        showSuccess(`Device "${formData.deviceName}" updated successfully!`);
      } else {
        await createMutation.mutateAsync({
          ...formData,
          config: configObject
        } as CreateDeviceDto);
        showSuccess(`Device "${formData.deviceName}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save device");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Device',
      message: 'Are you sure you want to delete this device? This action will remove the device and its configurations from the system.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Device deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete device");
      }
    }
  };

  return (
    <>
      <PageMeta title="Device Management | Sistem Absen" description="Manage CCTV cameras and attendance biometric devices." />
      <PageBreadcrumb pageTitle="Devices" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Registry</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage monitoring and attendance hardware infrastructure.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="fill-white text-xl text-white" />

            Add Device
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Device</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Name or location..."
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

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("deviceName")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Device <SortIcon column="deviceName" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("ipAddress")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    IP Address <SortIcon column="ipAddress" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("location")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Location <SortIcon column="location" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading devices...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <VideoIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No devices found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />

                        Add your first device
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedDevices.map((device: Device) => (
                  <TableRow key={device.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                          <VideoIcon className="size-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{device.deviceName}</p>
                          <p className="text-[11px] text-gray-500 font-mono uppercase">{String(device.public_id).slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="text-theme-sm text-gray-600 dark:text-gray-400 font-mono">{device.ipAddress || "-"}</span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <MapPinIcon className="size-3.5" />
                        <span className="text-theme-sm">{device.location || "Floating"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                <div className="flex items-center justify-center">
                    <Switch 
                        checked={device.isActive} 
                        onChange={() => updateMutation.mutateAsync({ 
                            id: device.public_id, 
                            data: { isActive: !device.isActive } as UpdateDeviceDto 
                        })} 
                    />
                </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(device)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(device.public_id)}
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
        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> devices
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
        className="max-w-md"
        title={selectedDevice ? "Update Device" : "Create New Device"}
        description="Enter device details and configuration."
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
              form="device-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedDevice ? "Update Device" : "Save Device"}
            </button>
          </div>
        }
      >
          <form id="device-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-normal text-gray-500 uppercase tracking-wider">Device Name</label>
              <input
                type="text"
                value={formData.deviceName}
                onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                placeholder="e.g. Front Gate CCTV"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-normal text-gray-500 uppercase tracking-wider">IP Address</label>
                <input
                  type="text"
                  value={formData.ipAddress || ""}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  placeholder="e.g. 192.168.1.100"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-normal text-gray-500 uppercase tracking-wider">Location</label>
                <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <MapPinIcon className="size-4" />
                    </div>
                    <input
                    type="text"
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Main Entrance"
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                    />
                </div>
              </div>
            </div>



            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-normal text-gray-500 uppercase tracking-wider">Configuration</label>
                <button
                  type="button"
                  onClick={() => setConfigItems([...configItems, { key: "", value: "" }])}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-500 hover:text-brand-600"
                >
                  <PlusIcon className="size-3" /> Add Item
                </button>
              </div>
              
              <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                {configItems.length === 0 ? (
                   <p className="text-center text-xs text-gray-400 py-2 italic">No configuration items.</p>
                ) : (
                  configItems.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <input
                        type="text"
                        value={item.key}
                        onChange={(e) => {
                          const newItems = [...configItems];
                          newItems[index].key = e.target.value;
                          setConfigItems(newItems);
                        }}
                        placeholder="Key"
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/5 dark:text-white"
                      />
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => {
                          const newItems = [...configItems];
                          newItems[index].value = e.target.value;
                          setConfigItems(newItems);
                        }}
                        placeholder="Value"
                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/5 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setConfigItems(configItems.filter((_, i) => i !== index))}
                        className="mt-1 text-gray-400 hover:text-error-500"
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

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Devices;
