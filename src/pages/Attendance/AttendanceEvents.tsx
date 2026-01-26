import React, { useState } from "react";
import { useAttendanceEvents } from "../../api/hooks/useAttendance";
import { useDevices } from "../../api/hooks/useDevices"; // Assuming this hook exists
import { useDebounce } from "../../hooks/useDebounce";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Badge from "../../components/atoms/Badge";

import { GridIcon, ChevronLeftIcon, AngleRightIcon, SortIcon, EyeIcon, EditIcon, TrashIcon, PlusIcon, UserCircleIcon, TrashBinIcon } from "../../components/atoms/Icons";
import { format } from "date-fns";
import DatePicker from "../../components/molecules/DatePicker";
import CustomSelect from "../../components/molecules/CustomSelect";
import Button from "../../components/atoms/Button";
import Modal from "../../components/molecules/Modal";
import { useConfirm } from "../../hooks/useConfirm";

import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { showSuccess, showError } from "../../utils/toast";
import { Device } from "../../api/types/devices";
import { AttendanceEvent } from "../../api/types/attendance";
import { User } from "../../api/types/user";
import FormInput from "../../components/molecules/FormInput";

interface EventFormData {
  userId: string;
  deviceId: string;
  eventType: string;
  date: string;
  time: string;
}

const INITIAL_FORM_DATA: EventFormData = {
  userId: "",
  deviceId: "",
  eventType: "CHECK_IN",
  date: "",
  time: ""
};

const AttendanceEvents: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  const { data: eventsResponse, isLoading, deleteMutation } = useAttendanceEvents({
    page,
    limit,
    userId: debouncedSearch || undefined,
    startDate: startDate || undefined,
    type: eventType || undefined,
    deviceId: deviceId ? Number(deviceId) : undefined,
    sortBy: sortConfig?.key,
    sortOrder: sortConfig?.direction,
  });

  const { data: devicesResponse } = useDevices();
  const devices = devicesResponse?.data || [];

  const events = eventsResponse?.data || [];
  const meta = eventsResponse?.meta;

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<AttendanceEvent | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<EventFormData>(INITIAL_FORM_DATA);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Load data into edit form when modal opens
  React.useEffect(() => {
    if (selectedEvent && isEditModalOpen) {
      setFormData({
        userId: selectedEvent.resolvedUserId || "",
        deviceId: selectedEvent.captureLog?.deviceId || "",
        eventType: String(selectedEvent.eventType || "CHECK_IN"),
        date: selectedEvent.attendanceDate || "",
        time: selectedEvent.eventTime || ""
      });
    }
  }, [selectedEvent, isEditModalOpen]);

  const { createMutation, updateMutation } = useAttendanceEvents();

  const handleCreate = async () => {
    // Construct payload - assuming backend handles simple payload or strictly needs timestamp
    // For now mocking the structure based on fields
    const payload = {
      userId: formData.userId,
      deviceId: formData.deviceId,
      eventType: formData.eventType,
      attendanceDate: formData.date,
      eventTime: formData.time,
      timestamp: `${formData.date}T${formData.time}.000Z` // Fallback ISO
    };
    await createMutation.mutateAsync(payload);
    setIsCreateModalOpen(false);
    setFormData(INITIAL_FORM_DATA);
  };

  const handleUpdate = async () => {
    if (!selectedEvent) return;
    const payload = {
        userId: formData.userId, // updating resolved user
        deviceId: formData.deviceId,
        eventType: formData.eventType,
        attendanceDate: formData.date,
        eventTime: formData.time,
    };
    await updateMutation.mutateAsync({ id: selectedEvent.id, data: payload });
    setIsEditModalOpen(false);
  };

  const handleViewUser = (user: User | undefined) => {
    if (!user) return;
    // Adapt resolvedUser to User type if needed, but assuming they match close enough or are same
    // event.resolvedUser is Partial<User> or similar? Let's cast or ensure it has needed fields
    setSelectedUser(user as User); 
    setIsUserDetailModalOpen(true);
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const { confirm, confirmState } = useConfirm();

  const handleDelete = async (id: string) => {
    const shouldDelete = await confirm({
      title: "Delete Attendance Event",
      message: "Are you sure you want to delete this event? This action cannot be undone.",
      variant: "delete",
      confirmText: "Delete Event"
    });

    if (shouldDelete) {
        try {
            await deleteMutation.mutateAsync(id);
            showSuccess("Event deleted successfully");
        } catch (error) {
            showError(error, "Failed to delete event");
        }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(new Set(events.map(e => e.id)));
      } else {
          setSelectedIds(new Set());
      }
  };

  const handleSelectRow = (id: number | string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const confirmed = await confirm({
        variant: 'delete',
        title: 'Bulk Delete Events',
        message: `Are you sure you want to permanently delete ${count} selected events? This action cannot be undone.`,
        confirmText: `Delete ${count} Events`
    });

    if (confirmed) {
        try {
            const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id));
            await Promise.all(promises);
            showSuccess(`Successfully removed ${count} events.`);
            setSelectedIds(new Set());
        } catch (error) {
            showError(error, "Failed to remove some events");
        }
    }
  };

  return (
    <>
      <PageMeta title="Attendance Events | Attendance" description="View raw attendance events" />
      <PageBreadcrumb pageTitle="Attendance Events" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Events</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Raw check-in/out events from devices.</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Event
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search User</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <GridIcon className="size-4" />
              </div>
              <input
                type="text"
                placeholder="Search user ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
              />
            </div>
          </div>

          <DatePicker
            label="Date"
            value={startDate}
            onChange={(date) => { setStartDate(date); setPage(1); }}
            placeholder="Select date"
          />

          <CustomSelect
             label="Event Type"
             value={eventType}
             onChange={(val) => { setEventType(String(val)); setPage(1); }}
             placeholder="All Types"
             options={[
                 { label: "All Types", value: "" },
                 { label: "Check In", value: "check_in" }, // Assuming enum values, might be CHECK_IN
                 { label: "Check Out", value: "check_out" }
             ]}
          />

          <CustomSelect
             label="Device"
             value={deviceId}
             onChange={(val) => { setDeviceId(String(val)); setPage(1); }}
             placeholder="All Devices"
             options={[
                 { label: "All Devices", value: "" },
                 ...devices.map((d: Device) => ({ label: d.location || d.deviceName, value: d.id || "" }))
             ]}
          />
        </div>

        {/* Bulk Selection Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm font-mono">
                {selectedIds.size}
              </div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Events Selected</p>
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
                    onClick={() => setSelectedIds(new Set())}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 w-12">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={events.length > 0 && selectedIds.size === events.length}
                        onChange={handleSelectAll}
                    />
                </TableCell>
                <TableCell isHeader className="px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.01]" onClick={() => handleSort("user")}>
                    <div className="flex items-center gap-1.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User <SortIcon className="size-3" />
                    </div>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.01]" onClick={() => handleSort("timestamp")}>
                    <div className="flex items-center gap-1.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Time <SortIcon className="size-3" />
                    </div>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Confidence</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">Loading events...</TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-gray-400">No attendance events found.</TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={selectedIds.has(event.id)}
                            onChange={() => handleSelectRow(event.id)}
                        />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {event.resolvedUser?.name || "Unknown User"}
                            </span>
                            <span className="font-mono text-[10px] text-gray-500">
                                {event.resolvedUserId?.substring(0, 8) || "N/A"}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {event.captureLog?.capturedAt ? format(new Date(event.captureLog.capturedAt), "HH:mm:ss") : "--:--:--"}
                            </span>
                            <span className="text-[11px] text-gray-500">
                                {event.captureLog?.capturedAt ? format(new Date(event.captureLog.capturedAt), "MMM dd, yyyy") : "N/A"}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <Badge color={event.eventType === "CHECK_IN" ? "success" : "warning"}>
                            {event.eventType.replace("_", " ")}
                        </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{event.captureLog?.deviceId || "N/A"}</span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                        <span className={`text-sm font-medium ${
                            (event.resolution?.matchConfidence || 0) > 0.8 ? "text-success-600" : 
                            (event.resolution?.matchConfidence || 0) > 0.5 ? "text-warning-600" : "text-error-600"
                        }`}>
                            {((event.resolution?.matchConfidence || 0) * 100).toFixed(0)}%
                        </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                             {event.resolvedUser && (
                                <button
                                    onClick={() => handleViewUser(event.resolvedUser)}
                                    className="p-1.5 text-gray-500 hover:text-brand-500 transition-colors"
                                    title="See User Detail"
                                >
                                    <UserCircleIcon className="size-4" />
                                </button>
                             )}
                             <button
                                 onClick={() => { setSelectedEvent(event); setIsDetailModalOpen(true); }}
                                 className="p-1.5 text-gray-500 hover:text-brand-500 transition-colors"
                                 title="View Details"
                             >
                                 <EyeIcon className="size-4" />
                             </button>
                             <button
                                 onClick={() => { setSelectedEvent(event); setIsEditModalOpen(true); }}
                                 className="p-1.5 text-gray-500 hover:text-brand-500 transition-colors"
                                 title="Edit"
                             >
                                 <EditIcon className="size-4" />
                             </button>
                             <button
                                 onClick={() => handleDelete(event.id)}
                                 className="p-1.5 text-gray-500 hover:text-error-500 transition-colors"
                                 title="Delete"
                             >
                                 <TrashIcon className="size-4" />
                             </button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination - Reuse existing logic */}
        {meta && (meta.totalPages || 0) > 1 && (
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
                         <span className="text-sm text-gray-500 dark:text-gray-400">{meta.totalPages}</span>
                     </div>
                     <button
                         onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
                         disabled={page === (meta.totalPages || 0)}
                         className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                     >
                         Next
                         <AngleRightIcon className="size-4" />
                     </button>
                </div>
             </div>
        )}

        {/* View Modal */}
         <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Event Details" className="max-w-md">
            {selectedEvent && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                             <p className="text-xs text-gray-500">Event Type</p>
                             <Badge color={selectedEvent.eventType === "CHECK_IN" ? "success" : "warning"}>
                                {selectedEvent.eventType}
                             </Badge>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500">Timestamp</p>
                             <p className="text-sm font-medium">{selectedEvent.captureLog?.capturedAt ? format(new Date(selectedEvent.captureLog.capturedAt), "PPpp") : "N/A"}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500">Device ID</p>
                             <p className="text-sm font-medium">{selectedEvent.captureLog?.deviceId}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500">Confidence</p>
                             <p className="text-sm font-medium">{((selectedEvent.resolution?.matchConfidence || 0) * 100).toFixed(2)}%</p>
                         </div>
                         <div className="col-span-2">
                             <p className="text-xs text-gray-500">Raw Identifier</p>
                             <p className="text-sm font-medium">{selectedEvent.captureLog?.rawIdentifier || "-"}</p>
                         </div>
                    </div>
                </div>
            )}
        </Modal>

        {/* Edit Modal (Placeholder) */}
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Event" className="max-w-md">
            <div className="space-y-4 p-4">
                <FormInput
                    label="User ID"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="Enter User UUID"
                />
                <div className="grid grid-cols-2 gap-4">
                    <DatePicker
                        label="Date"
                        value={formData.date}
                        onChange={(date) => setFormData({ ...formData, date })}
                    />
                    <FormInput
                        label="Time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        step="1"
                    />
                </div>
                <CustomSelect
                    label="Event Type"
                    value={formData.eventType}
                    onChange={(val) => setFormData({ ...formData, eventType: String(val) })}
                    options={[
                        { label: "Check In", value: "CHECK_IN" },
                        { label: "Check Out", value: "CHECK_OUT" }
                    ]}
                />
                <CustomSelect
                     label="Device"
                     value={formData.deviceId}
                     onChange={(val) => setFormData({ ...formData, deviceId: String(val) })}
                     options={[
                         { label: "Select Device", value: "" },
                         ...devices.map((d: Device) => ({ label: d.location || d.deviceName, value: d.id || "" }))
                     ]}
                />
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdate} isLoading={updateMutation.isPending}>Save Changes</Button>
                </div>
            </div>
        </Modal>

         {/* Create Modal (Placeholder) */}
         <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add Event" className="max-w-md">
             <div className="space-y-4 p-4">
                <FormInput
                    label="User ID"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="Enter User UUID"
                />
                <div className="grid grid-cols-2 gap-4">
                    <DatePicker
                        label="Date"
                        value={formData.date}
                        onChange={(date) => setFormData({ ...formData, date })}
                    />
                    <FormInput
                        label="Time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        step="1"
                    />
                </div>
                <CustomSelect
                    label="Event Type"
                    value={formData.eventType}
                    onChange={(val) => setFormData({ ...formData, eventType: String(val) })}
                    options={[
                        { label: "Check In", value: "CHECK_IN" },
                        { label: "Check Out", value: "CHECK_OUT" }
                    ]}
                />
                <CustomSelect
                     label="Device"
                     value={formData.deviceId}
                     onChange={(val) => setFormData({ ...formData, deviceId: String(val) })}
                     options={[
                         { label: "Select Device", value: "" },
                         ...devices.map((d: Device) => ({ label: d.location || d.deviceName, value: d.id || "" }))
                     ]}
                />
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} isLoading={createMutation.isPending}>Create Event</Button>
                </div>
             </div>
        </Modal>
        {/* User Detail Modal */}
        <UserDetailModal 
            isOpen={isUserDetailModalOpen} 
            onClose={() => setIsUserDetailModalOpen(false)} 
            userId={selectedUser?.id || null}
            initialUser={selectedUser} 
        />
        <ConfirmDialog {...confirmState} />
      </div>
    </>
  );
};

import { useUser } from "../../api/hooks/useUser";

const UserDetailModal = ({ isOpen, onClose, userId, initialUser }: { isOpen: boolean; onClose: () => void; userId: string | null; initialUser: User | null }) => {
    const { data: userResponse, isLoading } = useUser(userId || undefined);
    const user = userResponse?.data || initialUser;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-md" title="User Details">
            {!user && isLoading ? (
                 <div className="flex flex-col items-center justify-center p-8 space-y-4">
                     <div className="size-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
                     <p className="text-sm text-gray-500">Loading user profile...</p>
                 </div>
            ) : user ? (
            <div className="flex flex-col items-center p-6 space-y-6">
                <div className="relative group">
                    <div className="w-32 h-[170px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center overflow-hidden bg-gray-50 dark:bg-white/5 shadow-inner">
                        {user.photo ? (
                            <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                                <UserCircleIcon className="size-16 text-gray-300" />
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">3×4</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="w-full space-y-4">
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{user.name}</h3>
                        <p className="text-sm text-gray-500 font-mono">{user.public_id || "No ID"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                         <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={user.email}>{user.email}</p>
                         </div>
                         <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.phone || "-"}</p>
                         </div>
                         <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl col-span-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${user.isActive ? 'bg-success-500' : 'bg-gray-300'}`}></span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.isActive ? "Active User" : "Inactive"}</span>
                            </div>
                         </div>
                    </div>
                </div>
                
                <div className="w-full pt-2">
                     <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
                </div>
            </div>
            ) : (
                <div className="p-8 text-center text-gray-500">
                    <p>User not found.</p>
                    <Button variant="outline" className="mt-4" onClick={onClose}>Close</Button>
                </div>
            )}
        </Modal>
    );
};

export default AttendanceEvents;
