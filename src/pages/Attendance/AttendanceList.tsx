import React, { useState, useEffect, useRef } from "react";
import { useAttendanceList, useAttendanceStatuses } from "../../api/hooks/useAttendance";
import { useEvents } from "../../api/hooks/useEvents";
import { useClasses, useAcademicYears, useMajors } from "../../api/hooks/useAcademic";
import { useSettings } from "../../api/hooks/useSettings";
import { AttendanceRecord } from "../../api/types/attendance";
import { Class } from "../../api/types/academic";
import { Event } from "../../api/types/events";
import { academicService } from "../../api/services/academicService";
import { eventService } from "../../api/services/eventService";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Badge from "../../components/atoms/Badge";
import CustomSelect from "../../components/molecules/CustomSelect";
import { 
    GridIcon, 
    ChevronLeftIcon, 
    AngleRightIcon, 
    EyeIcon, 
    EditIcon, 
    TrashIcon, 
    PlusIcon, 
    VideoIcon, 
    EditIcon as ManualIcon,
    PencilIcon,
    CalenderIcon,
    TimeIcon,
    UserIcon,
    FilterIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    LockIcon,
    CheckCircleIcon,
    SearchIcon,
} from "../../components/atoms/Icons";
import NumberInput from "../../components/atoms/NumberInput";
import { format, parseISO } from "date-fns";
import DatePicker from "../../components/molecules/DatePicker";
import Button from "../../components/atoms/Button";
import Modal from "../../components/molecules/Modal";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import SearchableAsyncSelect from "../../components/molecules/SearchableAsyncSelect";
import { userService } from "../../api/services/userService";
import Label from "../../components/atoms/Label";
import DataActionsMenu from "../../components/molecules/DataActionsMenu";

import { showSuccess, showError } from "../../utils/toast";
import { SmoothHeight } from "../../components/atoms/SmoothHeight";
import QrScanner from "../../components/molecules/QrScanner";
import { MapPinIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};
import QRCode from "react-qr-code";
import { useAuthStore } from "../../store/authStore";
import { useIsMobile } from "../../hooks/useIsMobile";
import AttendanceRecordCard from "./AttendanceRecordCard";
import Dropdown from "../../components/molecules/Dropdown";
import DropdownItem from "../../components/atoms/DropdownItem";
import TableActionMenu from "../../components/molecules/TableActionMenu";

const MoreHorizontalIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
);

const RowActionMenu = ({ 
    onQuickCheckOut, 
    onViewDetails, 
    onEdit,
    onDelete,
    canCheckOut
}: { 
    onQuickCheckOut: () => void, 
    onViewDetails: () => void, 
    onEdit: () => void,
    onDelete: () => void,
    canCheckOut: boolean 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative flex justify-end">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200">
        <MoreHorizontalIcon className="size-5" />
      </button>
      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)}
        className="absolute right-0 top-full z-20 mt-1 w-40 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900">
        {canCheckOut && (
          <DropdownItem onClick={() => { setIsOpen(false); onQuickCheckOut(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
            <CheckCircleIcon className="size-3.5" /> Check Out
          </DropdownItem>
        )}
        <DropdownItem onClick={() => { setIsOpen(false); onViewDetails(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]">
          <EyeIcon className="size-3.5" /> View Details
        </DropdownItem>
        <DropdownItem onClick={() => { setIsOpen(false); onEdit(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]">
          <PencilIcon className="size-3.5" /> Edit Record
        </DropdownItem>
        <div className="my-1 border-t border-gray-100 dark:border-white/[0.05]" />
        <DropdownItem onClick={() => { setIsOpen(false); onDelete(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10">
          <TrashIcon className="size-3.5" /> Delete Record
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

export const MethodIcon = ({ method }: { method?: string }) => {
    switch (method?.toUpperCase()) {
        case "FACE": return <VideoIcon className="size-3.5" />;
        case "QR_CODE": return <GridIcon className="size-3.5" />;
        case "MANUAL": return <ManualIcon className="size-3.5" />;
        default: return <GridIcon className="size-3.5" />;
    }
};

const AttendanceList: React.FC = () => {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [majorId, setMajorId] = useState("");
  const { data: settingsResponse } = useSettings({ limit: 100 });
  const [attendanceType, setAttendanceType] = useState<string>("");
  const [eventId, setEventId] = useState("");
  const [lateMinutes, setLateMinutes] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [filterTab, setFilterTab] = useState<"academic" | "event" | "general">("academic");

  // Filter Context Logic
  // Automatically switch tab based on existing state if needed, or just let users toggle


  const [searchTerm, setSearchTerm] = useState("");

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "qr_scan">("manual");
  const [qrMode, setQrMode] = useState<"scan" | "show">("scan");
  const [isQrActivated, setIsQrActivated] = useState(false);
  const [isLatUnlocked, setIsLatUnlocked] = useState(false);
  const [isLngUnlocked, setIsLngUnlocked] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const attendanceMode = "check-in";

  // Form states
  const [manualForm, setManualForm] = useState({
    userId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    clockIn: "",
    clockOut: "",
    statusLabel: "present" as "present" | "late" | "absent" | "sick" | "excused",
    notes: "",
    eventId: "",
    latitude: 0,
    longitude: 0,
    classId: "" as string | number,
    photo: null as Blob | null
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = async (mode: "user" | "environment") => {
      try {
          if (videoRef.current && videoRef.current.srcObject) {
              const stream = videoRef.current.srcObject as MediaStream;
              stream.getTracks().forEach(track => track.stop());
          }
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      } catch (err) {
          console.error("Error accessing camera:", err);
          showError("Failed to access camera");
          setIsCameraOpen(false);
      }
  };


  const [qrForm, setQrForm] = useState({
    qrData: "",
    deviceId: "ADMIN_DASHBOARD",
    latitude: 0,
    longitude: 0,
    classId: "" as string | number,
    eventId: "",
    notes: ""
  });

  const [selectedClassDetail, setSelectedClassDetail] = useState<Class | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState<Event | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const { data: attendanceResponse, isLoading, deleteMutation, updateMutation, createManualMutation, updateManualMutation, qrScanMutation, checkInMutation, checkOutMutation } = useAttendanceList({
    page,
    limit,
    userId: searchTerm || undefined,
    statusId: statusId ? Number(statusId) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    classId: classId || undefined,
    academicYearId: academicYearId || undefined,
    majorId: majorId || undefined,
    type: attendanceType || undefined,
    eventId: eventId || undefined,
    lateMinutes: lateMinutes || undefined,
    sortBy: undefined,
    sortOrder: undefined,
  });

  const records = attendanceResponse?.data || [];
  const meta = attendanceResponse?.meta;

  const { data: eventsResponse } = useEvents({ limit: 100 });
  const events = eventsResponse?.data || [];

  const { data: classesResponse } = useClasses({ limit: 100 });
  const classes = classesResponse?.data || [];

  const { data: academicYearsResponse } = useAcademicYears({ limit: 100 });
  const academicYears = academicYearsResponse?.data || [];

  const { data: majorsResponse } = useMajors({ limit: 100 });
  const majors = majorsResponse?.data || [];

  const { data: statusesResponse } = useAttendanceStatuses();
  const apiStatuses = statusesResponse?.data || [];
  
  const [isSearching, setIsSearching] = useState(false);
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);
  const { confirm, confirmState } = useConfirm();

  // Export/Import Stubs
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleExportExcel = async (ids?: string[]) => {
      showError("Export to Excel is not yet implemented on the backend.");
  };

  const handleExportPdf = async () => {
      showError("Export to PDF is not yet implemented on the backend.");
  };

  const handleDownloadTemplate = async (withData: boolean) => {
      showError("Template download is not yet implemented on the backend.");
  };

  const fetchLocation = React.useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setQrForm(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          setManualForm(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error("Location fetching error:", error);
          showError("Location access denied. Coordinates set to 0.");
        }
      );
    }
  }, []);

  useEffect(() => {
    if (isCreateModalOpen) {
        fetchLocation();
    }
  }, [isCreateModalOpen, fetchLocation]);

  useEffect(() => {
    const fetchContextDetails = async () => {
        if (!qrForm.classId && !qrForm.eventId) {
            setSelectedClassDetail(null);
            setSelectedEventDetail(null);
            return;
        }

        setIsDetailLoading(true);
        try {
            if (qrForm.classId) {
                const classData = await academicService.getClass(qrForm.classId);
                setSelectedClassDetail(classData);
                setSelectedEventDetail(null);
            } else if (qrForm.eventId) {
                const eventData = await eventService.getEvent(qrForm.eventId);
                setSelectedEventDetail(eventData);
                setSelectedClassDetail(null);
            }
        } catch (error) {
            console.error("Error fetching context details:", error);
        } finally {
            setIsDetailLoading(false);
        }
    };

    if (isCreateModalOpen && createMode === "qr_scan") {
        fetchContextDetails();
    }
  }, [qrForm.classId, qrForm.eventId, isCreateModalOpen, createMode]);

  const searchUsers = React.useCallback(async (term: string) => {
    setIsSearching(true);
    try {
      const result = await userService.getUsers({ search: term, limit: 20 });
      const options = result.data.map(u => ({ label: u.name, value: u.public_id }));
      setUserOptions(options);
    } catch (error) {
      console.error("Failed to search users", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const [eventSearch, setEventSearch] = useState("");
  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(eventSearch.toLowerCase()) || 
    e.eventType.toLowerCase().includes(eventSearch.toLowerCase())
  );
  const eventOptions = filteredEvents.map(e => ({ 
    label: e.name, 
    value: String(e.id),
    subLabel: e.eventType 
  }));

  const resetManualForm = () => {
    setManualForm({
        userId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        clockIn: "",
        clockOut: "",
        statusLabel: "present" as "present" | "late" | "absent" | "sick" | "excused",
        notes: "",
        eventId: "",
        latitude: 0,
        longitude: 0,
        classId: "",
        photo: null
    });
    setIsLatUnlocked(false);
    setIsLngUnlocked(false);
  };

  const resetQrForm = () => {
    setQrForm({
        qrData: "",
        deviceId: "ADMIN_DASHBOARD",
        latitude: 0,
        longitude: 0,
        classId: "",
        eventId: "",
        notes: ""
    });
    setIsQrActivated(false);
    setIsLatUnlocked(false);
    setIsLngUnlocked(false);
    setSelectedClassDetail(null);
    setSelectedEventDetail(null);
  };

  const handleCreateManual = async () => {
    // Basic validation
    if (!manualForm.userId) return showError("Please select a user");
    // Removed strict photo validation for manual entry

    const formData = new FormData();
    formData.append("deviceId", "ADMIN_DASHBOARD");
    formData.append("latitude", String(manualForm.latitude));
    formData.append("longitude", String(manualForm.longitude));
    if (manualForm.photo) formData.append("photo", manualForm.photo); 
    formData.append("method", "MANUAL"); // Explicitly setting method
    formData.append("manualCreatorId", "ADMIN"); // Placeholder, backend handles real ID or we get from store
    formData.append("notes", manualForm.notes);
    if (manualForm.classId) formData.append("classId", String(manualForm.classId));
    if (manualForm.eventId) formData.append("eventId", manualForm.eventId);
    
    // Status and Time logic
    formData.append("statusLabel", manualForm.statusLabel);
    formData.append("date", format(new Date(manualForm.date), "yyyy-MM-dd"));
    
    if (manualForm.clockIn) {
         formData.append("clockIn", `${format(new Date(manualForm.date), "yyyy-MM-dd")}T${manualForm.clockIn.split(':').length === 2 ? manualForm.clockIn + ':00' : manualForm.clockIn}`);
    }
    if (manualForm.clockOut) {
         formData.append("clockOut", `${format(new Date(manualForm.date), "yyyy-MM-dd")}T${manualForm.clockOut.split(':').length === 2 ? manualForm.clockOut + ':00' : manualForm.clockOut}`);
    }

    try {
      await createManualMutation.mutateAsync(formData);
      showSuccess("Record created/updated manually by admin");
      setIsCreateModalOpen(false);
      resetManualForm();
      setManualForm(prev => ({ ...prev, photo: null })); // Reset photo specifically
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showError(err?.response?.data?.message || "Failed to create manual record");
    }
  };

  const handleUpdate = () => {
        if (!selectedRecord) return;

        const payload = {
            userId: manualForm.userId,
            date: format(new Date(manualForm.date), "yyyy-MM-dd"), // Ensure date format strictly
            clockIn: manualForm.clockIn ? `${format(new Date(manualForm.date), "yyyy-MM-dd")}T${manualForm.clockIn}` : null,
            clockOut: manualForm.clockOut ? `${format(new Date(manualForm.date), "yyyy-MM-dd")}T${manualForm.clockOut}` : null,
            statusLabel: manualForm.statusLabel,
            notes: manualForm.notes,
            eventId: manualForm.eventId || undefined,
            latitude: manualForm.latitude,
            longitude: manualForm.longitude,
            classId: manualForm.classId ? Number(manualForm.classId) : null,
        };

        updateManualMutation.mutate({
            id: selectedRecord.public_id!,
            data: payload
        }, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedRecord(null);
                showSuccess("Attendance record updated successfully");
            },
            onError: (error: unknown) => {
                const err = error as { response?: { data?: { message?: string } } };
                showError(err.response?.data?.message || "Failed to update record");
            }
        });
    };

    const handleQuickCheckOut = async (record: AttendanceRecord) => {
        console.log("Quick Checkout Clicked for:", record.public_id);
        const isConfirmed = await confirm({
            title: "Quick Check-out",
            message: `Are you sure you want to check out ${record.user?.name || "this user"}?`,
            confirmText: "Check Out",
            variant: "warning",
            cancelText: "Cancel"
        });

        if (isConfirmed) {
            const now = new Date();
            const payload = {
                clockOut: now.toISOString(),
            };
            updateManualMutation.mutate({
            id: record.public_id!,
                data: payload
            }, {
                onSuccess: () => {
                    showSuccess("User checked out successfully");
                },
                onError: (error: unknown) => {
                    const err = error as { response?: { data?: { message?: string } } };
                    showError(err.response?.data?.message || "Failed to check out user");
                }
            });
        }
    };

  const handleQrScan = async () => {
    if (!qrForm.qrData) return showError("Please enter QR data");
    
    // Automated QR Scan: POST /api/v1/attendance/qr-scan
    // Context-Aware: Decides /check-in or /check-out based on status
    const payload = {
        qrData: qrForm.qrData,
        deviceId: "ADMIN_DASHBOARD",
        latitude: qrForm.latitude,
        longitude: qrForm.longitude,
        classId: qrForm.classId ? Number(qrForm.classId) : undefined,
        eventId: qrForm.eventId || undefined
    };

    try {
      await qrScanMutation.mutateAsync(payload);
      showSuccess("Attendance processed via QR scan (Automated)");
      setIsCreateModalOpen(false);
      resetQrForm();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showError(err?.response?.data?.message || "Failed to process QR scan");
    }
  };


  const handleDelete = async (id: number | string) => {
    const shouldDelete = await confirm({
      title: "Delete Attendance Record",
      message: "Are you sure you want to delete this attendance record? This action cannot be undone.",
      variant: "delete",
      confirmText: "Delete Record"
    });

    if (shouldDelete) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Record deleted successfully");
      } catch (error) {
        console.error("Delete failed", error);
        showError("Failed to delete record");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const shouldDelete = await confirm({
      title: "Delete Selected Records",
      message: `Are you sure you want to delete ${selectedIds.size} attendance records? This action cannot be undone.`,
      variant: "delete",
      confirmText: `Delete ${selectedIds.size} Records`
    });

    if (shouldDelete) {
      try {
        const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id));
        await Promise.all(promises);
        showSuccess(`Successfully deleted ${selectedIds.size} records`);
        setSelectedIds(new Set());
      } catch (error) {
        console.error("Bulk delete failed", error);
        showError("Failed to delete some records");
      }
    }
  };

  const handleBulkStatusUpdate = async (statusLabel: string) => {
    if (selectedIds.size === 0) return;

    const shouldUpdate = await confirm({
      title: "Update Status for Selected Records",
      message: `Are you sure you want to set the status to "${statusLabel}" for ${selectedIds.size} records?`,
      variant: "warning",
      confirmText: "Update Status"
    });

    if (shouldUpdate) {
      try {
        const promises = Array.from(selectedIds).map(id => 
          updateMutation.mutateAsync({ 
            id, 
            data: { statusLabel } as Partial<AttendanceRecord>
          })
        );
        await Promise.all(promises);
        showSuccess(`Successfully updated ${selectedIds.size} records`);
        setSelectedIds(new Set());
      } catch (error) {
        console.error("Bulk update status failed", error);
        showError("Failed to update status for some records");
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length && records.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.public_id).filter(Boolean) as string[]));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const getStatusColor = (statusName?: string) => {
    switch (statusName?.toLowerCase()) {
      case "hadir":
      case "present": return "success";
      case "terlambat":
      case "late": return "warning";
      case "alpa":
      case "absent": return "error";
      case "izin":
      case "excused": return "info";
      case "sakit":
      case "sick": return "info";
      default: return "light";
    }
  };

  const statusOptions = [
    { label: "All Statuses", value: "" },
    ...apiStatuses.map(s => ({ label: s.name, value: String(s.id) }))
  ];

  const getAttendanceType = (record: AttendanceRecord) => {
    if (record.eventId) return { label: "Event", context: record.event?.name || "Specific Event" };
    if (record.classId) return { label: "Class", context: record.class?.name || "Regular Class" };
    if (record.method === "SHIFT") return { label: "Shift", context: "Assigned Shift" };
    return { label: "General", context: "Gate Entry" };
  };

  return (
    <>
      <PageMeta title="Attendance List | Attendance" description="View attendance records" />
      <PageBreadcrumb pageTitle="Attendance Records" />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <CalenderIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Attendance Records</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monitor daily attendance logs.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataActionsMenu
                isExporting={isExporting || isDownloadingTemplate}
                isImporting={isImporting}
                onExportExcel={() => handleExportExcel()}
                onExportPdf={() => handleExportPdf()}
                onExportExcelSelected={selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined}
                selectedCount={selectedIds.size}
                onImportClick={() => setIsImportModalOpen(true)}
                onDownloadTemplate={() => handleDownloadTemplate(false)}
            />
            {(() => {
              const user = useAuthStore.getState().user;
              if (!user?.roles || user.roles.length === 0) return null;
              const roleNames = user.roles.map(r => r.name.toLowerCase());
              const isAdminOrStaff = roleNames.some(role => 
                role === 'admin' || role.includes('admin') || role === 'staff' || role.includes('staff')
              );
              return isAdminOrStaff ? (
                <button 
                  onClick={() => {
                    resetManualForm();
                    resetQrForm();
                    setIsCreateModalOpen(true);
                  }}
                  className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
                >
                  <PlusIcon className="fill-white size-4" /> Add Record
                </button>
              ) : null;
            })()}
          </div>
        </div>

        {/* Mobile FAB */}
        <div className="sm:hidden fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
            <DataActionsMenu
                isExporting={isExporting || isDownloadingTemplate}
                isImporting={isImporting}
                onExportExcel={() => handleExportExcel()}
                onExportPdf={() => handleExportPdf()}
                onExportExcelSelected={selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined}
                selectedCount={selectedIds.size}
                onImportClick={() => setIsImportModalOpen(true)}
                onDownloadTemplate={() => handleDownloadTemplate(false)}
                isMobileFab={true}
            />
            {(() => {
              const user = useAuthStore.getState().user;
              if (!user?.roles || user.roles.length === 0) return null;
              const roleNames = user.roles.map(r => r.name.toLowerCase());
              const isAdminOrStaff = roleNames.some(role => 
                role === 'admin' || role.includes('admin') || role === 'staff' || role.includes('staff')
              );
              return isAdminOrStaff ? (
                <button
                    onClick={() => {
                        resetManualForm();
                        resetQrForm();
                        setIsCreateModalOpen(true);
                    }}
                    className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
                    aria-label="Add Record"
                >
                    <PlusIcon className="size-6 fill-white" />
                </button>
              ) : null;
            })()}
        </div>

        {/* ── Advanced Filter Card ── */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden">
            <button 
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)} 
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <FilterIcon className="size-5 text-brand-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                            Search & Filter Attendance
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Use the criteria below to filter attendance logs based on academic year, class, and date.
                    </p>
                </div>
                <div className="shrink-0 ml-4">
                    <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFiltersExpanded ? "rotate-180" : ""}`} />
                </div>
            </button>
            
            <div 
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    isFiltersExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
            >
                <div className="overflow-hidden min-h-0">
                    <div className="px-5 pb-5">
                        <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                        
                        {/* Segmented Control */}
                        <div className="flex flex-col gap-3 mb-5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Filter Context</label>
                            <div className="inline-flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
                                {[
                                    { id: 'academic', label: 'Academic & Class', icon: <GridIcon className="size-3.5" /> },
                                    { id: 'event', label: 'Attendance Events', icon: <PlusIcon className="size-3.5" /> },
                                    { id: 'general', label: 'Global Search', icon: <FilterIcon className="size-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setFilterTab(tab.id as "academic" | "event" | "general");
                                            if (tab.id === 'event') {
                                                setClassId("");
                                                setMajorId("");
                                                setAcademicYearId("");
                                                setAttendanceType("");
                                            } else if (tab.id === 'academic') {
                                                setEventId("");
                                            } else {
                                                setEventId("");
                                                setClassId("");
                                                setMajorId("");
                                                setAcademicYearId("");
                                                setAttendanceType("");
                                            }
                                            setPage(1);
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                            filterTab === tab.id 
                                                ? 'bg-white dark:bg-white/10 text-brand-600 dark:text-brand-400 shadow-sm' 
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-5">
                            <SmoothHeight>
                                {filterTab === 'academic' && (
                                    <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Academic Year</Label>
                                            <CustomSelect
                                                value={academicYearId === "all" || academicYearId === "" ? "" : Number(academicYearId)}
                                                onChange={(val) => { 
                                                    setAcademicYearId(val ? String(val) : "all"); 
                                                    setMajorId("all");
                                                    setClassId("all");
                                                    setPage(1); 
                                                }}
                                                onClear={() => { 
                                                    setAcademicYearId("all"); 
                                                    setMajorId("all");
                                                    setClassId("all");
                                                    setPage(1); 
                                                }}
                                                placeholder="All Years"
                                                options={academicYears.map((ay: any) => ({ label: ay.code || ay.name, value: Number(ay.id) }))}
                                                className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Major</Label>
                                            <CustomSelect
                                                value={majorId === "all" || majorId === "" ? "" : Number(majorId)}
                                                onChange={(val) => { 
                                                    setMajorId(val ? String(val) : "all"); 
                                                    setClassId("all");
                                                    setPage(1); 
                                                }}
                                                onClear={() => { 
                                                    setMajorId("all"); 
                                                    setClassId("all");
                                                    setPage(1); 
                                                }}
                                                placeholder="All Majors"
                                                options={majors.map((m: any) => ({ label: m.name, value: Number(m.id) }))}
                                                className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Class</Label>
                                            <CustomSelect
                                                value={classId === "all" || classId === "" ? "" : Number(classId)}
                                                onChange={(val) => { setClassId(val ? String(val) : "all"); setPage(1); }}
                                                onClear={() => { setClassId("all"); setPage(1); }}
                                                placeholder="All Classes"
                                                options={classes.map((c: any) => ({ label: c.name, value: Number(c.id) }))}
                                                className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Mode</Label>
                                            <CustomSelect
                                                value={attendanceType === "all" || attendanceType === "" ? "" : attendanceType}
                                                onChange={(val) => { setAttendanceType(val ? String(val) : "all"); setPage(1); }}
                                                onClear={() => { setAttendanceType("all"); setPage(1); }}
                                                placeholder="Daily & Class"
                                                options={[
                                                    { label: "Daily Attendance", value: "DAILY" },
                                                    { label: "Class Attendance", value: "CLASS" },
                                                ]}
                                                className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                            />
                                        </div>
                                    </div>
                                )}

                                {filterTab === 'event' && (
                                    <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="space-y-1.5 lg:col-span-2">
                                            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Attendance Event</Label>
                                            <CustomSelect
                                                value={eventId === "all" || eventId === "" ? "" : Number(eventId)}
                                                onChange={(val) => { setEventId(val ? String(val) : "all"); setPage(1); }}
                                                onClear={() => { setEventId("all"); setPage(1); }}
                                                placeholder="Select Event"
                                                options={events.map((e: any) => ({ label: e.name, value: Number(e.id) }))}
                                                className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                            />
                                        </div>
                                    </div>
                                )}

                                {filterTab === 'general' && (
                                    <div className="p-8 mb-5 text-center bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-dashed border-gray-200 dark:border-white/5 animate-in fade-in zoom-in-95 duration-300">
                                        <p className="text-sm text-gray-500">Using global filters (Date, Status, Search). Click a context tab to filter by specific criteria.</p>
                                    </div>
                                )}
                            </SmoothHeight>
                        </div>

                        <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                                <CustomSelect
                                    value={statusId === "all" ? "" : statusId}
                                    onChange={(val) => { setStatusId(val ? String(val) : "all"); setPage(1); }}
                                    onClear={() => { setStatusId("all"); setPage(1); }}
                                    placeholder="All Statuses"
                                    options={apiStatuses.map((s: any) => ({ label: s.name, value: String(s.id) }))}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Start Date</Label>
                                <DatePicker
                                    value={startDate}
                                    onChange={(date) => { setStartDate(date); setPage(1); }}
                                    placeholder="Start date"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">End Date</Label>
                                <DatePicker
                                    value={endDate}
                                    onChange={(date) => { setEndDate(date); setPage(1); }}
                                    placeholder="End date"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Late Minutes Threshold</Label>
                                <NumberInput
                                    placeholder="Minutes..."
                                    value={lateMinutes}
                                    onChange={(val) => { setLateMinutes(val); setPage(1); }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 items-end md:grid-cols-3">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Student Name / ID</Label>
                                <div className="relative">
                                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setSearchTerm(search);
                                                setPage(1);
                                            }
                                        }}
                                        placeholder="Search by Student Name or ID..."
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 md:col-span-1">
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setSearchTerm("");
                                        setStatusId("");
                                        setStartDate("");
                                        setEndDate("");
                                        setClassId("");
                                        setMajorId("");
                                        setAcademicYearId("");
                                        setAttendanceType("");
                                        setEventId("");
                                        setLateMinutes("");
                                        setPage(1);
                                    }}
                                    className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchTerm(search);
                                        setPage(1);
                                    }}
                                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-600"
                                >
                                    <SearchIcon className="size-4" />
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Selection Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                {selectedIds.size}
              </div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Records Selected</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative group/actions">
                  <Button variant="secondary" size="sm" className="h-[38px]">
                      Change Status <ChevronDownIcon className="ml-2 size-3 px-0.5" />
                  </Button>
                  <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-white/5 opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-20">
                      {[
                        { label: "Present (Hadir)", value: "present" },
                        { label: "Sick (Sakit)", value: "sick" },
                        { label: "Excused (Izin)", value: "excused" },
                        { label: "Absent (Alpha)", value: "absent" },
                        { label: "Late (Terlambat)", value: "late" },
                      ].map(status => (
                        <button 
                          key={status.value}
                          onClick={() => handleBulkStatusUpdate(status.value)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                        >
                          {status.label}
                        </button>
                      ))}
                  </div>
              </div>
              <Button variant="outline" size="sm" className="h-[38px] text-error-600 border-error-200 hover:bg-error-50 dark:border-error-500/30 dark:hover:bg-error-500/10" onClick={handleBulkDelete}>
                <TrashIcon className="mr-2 size-3.5 px-0.5" />
                Delete Selected
              </Button>
              <Button variant="secondary" size="sm" className="h-[38px]" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        )}
{/* Table - Mobile Scrollable, Desktop Fixed */}
        {isMobile ? (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12"><div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No records found</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {records.map((record) => (
                  <AttendanceRecordCard
                    key={record.public_id}
                    record={record}
                    isSelected={selectedIds.has(record.public_id!)}
                    onToggle={() => toggleSelectRow(record.public_id!)}
                    getStatusColor={getStatusColor}
                    onQuickCheckOut={record.clockIn && !record.clockOut ? () => handleQuickCheckOut(record) : undefined}
                    onViewDetails={() => { setSelectedRecord(record); setIsDetailModalOpen(true); }}
                    onEdit={() => {
                        setSelectedRecord(record);
                        setManualForm({
                            userId: record.userId,
                            date: record.date,
                            clockIn: record.clockIn ? format(parseISO(record.clockIn), "HH:mm:ss") : "",
                            clockOut: record.clockOut ? format(parseISO(record.clockOut), "HH:mm:ss") : "",
                            statusLabel: (record.statusLabel?.toLowerCase() || "present") as any,
                            notes: record.notes || "",
                            eventId: record.eventId || "",
                            latitude: record.latitude || 0,
                            longitude: record.longitude || 0,
                            classId: record.classId || "",
                            photo: null
                        });
                        setIsEditModalOpen(true);
                    }}
                    onDelete={() => handleDelete(record.public_id!)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto lg:overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="w-12 px-5 py-4">
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="size-4 rounded-md border-gray-300 dark:border-gray-700 text-brand-500 focus:ring-brand-500"
                      checked={records.length > 0 && selectedIds.size === records.length}
                      onChange={toggleSelectAll}
                    />
                  </div>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User & Identity</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance Details</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status & Source</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading records...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.public_id} className={`group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors ${selectedIds.has(record.public_id!) ? 'bg-brand-50/30 dark:bg-brand-500/5' : ''}`}>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="size-4 rounded-md border-gray-300 dark:border-gray-700 text-brand-500 focus:ring-brand-500"
                          checked={selectedIds.has(record.public_id!)}
                          onChange={() => toggleSelectRow(record.public_id!)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 overflow-hidden ring-1 ring-gray-100 dark:ring-white/10 size-10 shrink-0">
                           {record.user?.photo ? (
                               <img src={record.user.photo} alt={record.user.name} className="size-full object-cover" />
                           ) : (
                               <span className="text-sm font-bold uppercase">{record.user?.name?.charAt(0) || "U"}</span>
                           )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-gray-900 dark:text-white text-sm truncate">{record.user?.name || "Unknown User"}</span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {(() => {
                                const user = record.user as any;
                                if (!user) return <span className="text-[10px] text-gray-500 font-medium truncate tracking-tight">—</span>;
                                const isStudent = user.roles?.some((r: any) => r.name?.toLowerCase() === 'student' || r.name?.toLowerCase() === 'siswa');
                                const nis = user.studentProfile?.nis || user.profile?.nis || user.studentProfile?.nisn || user.profile?.nisn;
                                const eid = user.employeeProfile?.employeeId || user.profile?.employeeId || user.employeeProfile?.nip || user.profile?.nip;
                                
                                let idText = "—";
                                if (isStudent && nis) idText = `NIS: ${nis}`;
                                else if (!isStudent && eid) idText = `EID: ${eid}`;
                                else if (nis) idText = `NIS: ${nis}`;
                                else if (eid) idText = `EID: ${eid}`;

                                return <span className="text-[10px] text-gray-500 font-medium truncate tracking-tight">{idText}</span>;
                            })()}
                            <span className="size-0.5 rounded-full bg-gray-300"></span>
                            {(() => {
                                const type = getAttendanceType(record);
                                return (
                                    <span className="text-[10px] text-brand-500 font-bold uppercase tracking-tight truncate">
                                        {type.label}: {type.context}
                                    </span>
                                );
                            })()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {format(new Date(record.date), "MMM dd, yyyy")}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="size-1.5 rounded-full bg-success-500 flex-none"></span>
                                    <span className={record.isLate ? "text-error-600 font-bold" : "text-gray-600 dark:text-gray-400"}>
                                        {record.clockIn ? format(parseISO(record.clockIn), "HH:mm") : "--:--"}
                                        {record.isLate && ` (${record.lateMinutes}m)`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="size-1.5 rounded-full bg-error-500 flex-none"></span>
                                    <span className={record.isEarlyLeave ? "text-warning-600 font-bold" : "text-gray-600 dark:text-gray-400"}>
                                        {record.clockOut ? format(parseISO(record.clockOut), "HH:mm") : "--:--"}
                                        {record.isEarlyLeave && ` (${record.earlyLeaveMinutes}m)`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 whitespace-nowrap w-fit">
                        <div className="flex flex-col gap-1.5">
                            <Badge color={getStatusColor(record.statusLabel || undefined)}>
                                {record.status?.name || record.statusLabel || "Unknown"}
                            </Badge>
                            {record.clockIn && !record.clockOut && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-brand-50 border border-brand-100 dark:bg-brand-500/10 dark:border-brand-500/20 w-fit">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Active</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                <MethodIcon method={record.method || undefined} />
                                {record.method}
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                        <RowActionMenu
                            canCheckOut={!!(record.clockIn && !record.clockOut)}
                            onQuickCheckOut={() => handleQuickCheckOut(record)}
                            onViewDetails={() => { setSelectedRecord(record); setIsDetailModalOpen(true); }}
                            onEdit={() => {
                                setSelectedRecord(record); 
                                setManualForm({
                                    userId: record.userId,
                                    date: record.date,
                                    clockIn: record.clockIn ? format(parseISO(record.clockIn), "HH:mm:ss") : "",
                                    clockOut: record.clockOut ? format(parseISO(record.clockOut), "HH:mm:ss") : "",
                                    statusLabel: (record.statusLabel?.toLowerCase() || "present") as any,
                                    notes: record.notes || "",
                                    eventId: record.eventId || "",
                                    latitude: record.latitude || 0,
                                    longitude: record.longitude || 0,
                                    classId: record.classId || "",
                                    photo: null
                                });
                                setIsEditModalOpen(true); 
                            }}
                            onDelete={() => handleDelete(record.public_id!)}
                        />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}

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

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        className="max-w-xl"
        title="Create Attendance"
        description="Add a new attendance record manually or via QR scan data."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            {createMode === "manual" ? (
                <Button 
                    variant="primary" 
                    onClick={handleCreateManual} 
                    isLoading={checkInMutation.isPending || checkOutMutation.isPending}
                >
                    Process {attendanceMode === "check-in" ? "In" : "Out"}
                </Button>
            ) : (
                isQrActivated && qrMode === "scan" && (
                    <Button 
                        variant="primary" 
                        onClick={handleQrScan} 
                        isLoading={checkInMutation.isPending || checkOutMutation.isPending}
                    >
                        Process {attendanceMode === 'check-in' ? 'In' : 'Out'}
                    </Button>
                )
            )}
          </div>
        }
        subHeader={
          <div className="relative flex border-b border-gray-100 dark:border-white/[0.05]">
            <button
                onClick={() => setCreateMode("manual")}
                className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                    createMode === "manual" ? "text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
                <UserIcon className={`size-4 ${createMode === "manual" ? "fill-current" : ""}`} />
                Manual Entry
            </button>
            <button
                onClick={() => setCreateMode("qr_scan")}
                className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                    createMode === "qr_scan" ? "text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
                <GridIcon className={`size-4 ${createMode === "qr_scan" ? "fill-current" : ""}`} />
                QR Scan Data
            </button>
            <div 
                className="absolute -bottom-px h-0.5 bg-brand-500 transition-all duration-300 ease-in-out"
                style={{ width: '50%', left: createMode === "manual" ? '0%' : '50%' }}
            />
          </div>
        }
      >
        <SmoothHeight>
          <div className="py-2">
            {createMode === "manual" ? (
              <div className="space-y-4">
                <SearchableAsyncSelect
                    label="User"
                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                    placeholder="Search and select student..."
                    onSearch={searchUsers}
                    options={userOptions}
                    isLoading={isSearching}
                    value={manualForm.userId}
                    onChange={(val) => setManualForm(prev => ({ ...prev, userId: String(val) }))}
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <DatePicker
                        label="Date"
                        labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                        value={manualForm.date}
                        onChange={(val) => setManualForm(prev => ({ ...prev, date: val }))}
                    />
                    <CustomSelect
                        label="Status Label"
                        labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                        value={manualForm.statusLabel}
                        onChange={(val) => setManualForm(prev => ({ ...prev, statusLabel: String(val) as "present" | "late" | "absent" | "sick" | "excused" }))}
                        options={[
                            { label: "Present (Hadir)", value: "present" },
                            { label: "Sick (Sakit)", value: "sick" },
                            { label: "Excused (Izin)", value: "excused" },
                            { label: "Absent (Alpha)", value: "absent" },
                            { label: "Late (Terlambat)", value: "late" },
                        ]}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</label>
                        <input 
                            type="time" 
                            step="1"
                            value={manualForm.clockIn}
                            onChange={(e) => setManualForm(prev => ({ ...prev, clockIn: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</label>
                        <input 
                            type="time" 
                            step="1"
                            value={manualForm.clockOut}
                            onChange={(e) => setManualForm(prev => ({ ...prev, clockOut: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <SearchableAsyncSelect
                        label="Target Class (Optional)"
                        labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                        value={manualForm.classId || ""}
                        onChange={(val) => setManualForm(prev => ({ ...prev, classId: String(val) }))}
                        options={classes.map(c => ({ label: c.name, value: String(c.id), subLabel: c.code }))}
                        onSearch={() => {}} // Classes are pre-fetched, no async search needed
                        placeholder="Select class..."
                    />
                    <SearchableAsyncSelect
                        label="Associated Event (Optional)"
                        labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                        value={manualForm.eventId || ""}
                        onChange={(val) => setManualForm(prev => ({ ...prev, eventId: String(val) }))}
                        options={eventOptions}
                        onSearch={setEventSearch}
                        placeholder="Search event name..."
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <NumberInput
                            label="Latitude"
                            labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                            value={manualForm.latitude}
                            onChange={(val) => setManualForm(prev => ({ ...prev, latitude: Number(val) }))}
                            disabled={!isLatUnlocked}
                            step="any"
                        />
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                setIsLatUnlocked(!isLatUnlocked);
                            }}
                            className={`absolute top-0 right-0 p-1 flex items-center justify-center transition-all duration-300 ${
                                isLatUnlocked 
                                    ? 'text-amber-500 hover:text-amber-600' 
                                    : 'text-success-500 hover:text-success-600'
                            }`}
                            title={isLatUnlocked ? "Lock Latitude" : "Unlock Latitude"}
                        >
                            <LockIcon className={`size-3.5 ${isLatUnlocked ? 'opacity-60' : ''}`} />
                        </button>
                    </div>
                    <div className="relative">
                        <NumberInput
                            label="Longitude"
                            labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                            value={manualForm.longitude}
                            onChange={(val) => setManualForm(prev => ({ ...prev, longitude: Number(val) }))}
                            disabled={!isLngUnlocked}
                            step="any"
                        />
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                setIsLngUnlocked(!isLngUnlocked);
                            }}
                            className={`absolute top-0 right-0 p-1 flex items-center justify-center transition-all duration-300 ${
                                isLngUnlocked 
                                    ? 'text-amber-500 hover:text-amber-600' 
                                    : 'text-success-500 hover:text-success-600'
                            }`}
                            title={isLngUnlocked ? "Lock Longitude" : "Unlock Longitude"}
                        >
                            <LockIcon className={`size-3.5 ${isLngUnlocked ? 'opacity-60' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</label>
                    <textarea 
                        value={manualForm.notes}
                        onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add some context..."
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none"
                    />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {!isQrActivated ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                         <div className="grid grid-cols-2 gap-4">
                            <CustomSelect
                                label="Target Class"
                                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                                value={qrForm.classId}
                                onChange={(val) => setQrForm(prev => ({ ...prev, classId: val, eventId: "" }))}
                                options={classes.map(c => ({ label: c.name, value: c.id }))}
                                placeholder="Select Class"
                                disabled={!!qrForm.eventId}
                                onClear={() => setQrForm(prev => ({ ...prev, classId: "" }))}
                            />
                            <SearchableAsyncSelect
                                label="Associated Event"
                                labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                                value={qrForm.eventId || ""}
                                onChange={(val) => setQrForm(prev => ({ ...prev, eventId: String(val), classId: "" }))}
                                options={eventOptions}
                                onSearch={setEventSearch}
                                placeholder="Search Event..."
                                disabled={!!qrForm.classId}
                                onClear={() => setQrForm(prev => ({ ...prev, eventId: "" }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <NumberInput
                                    label="Latitude"
                                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    value={qrForm.latitude}
                                    onChange={(val) => setQrForm(prev => ({ ...prev, latitude: Number(val) }))}
                                    disabled={!isLatUnlocked}
                                    step="any"
                                />
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsLatUnlocked(!isLatUnlocked);
                                    }}
                                    className={`absolute top-0 right-0 p-1 flex items-center justify-center transition-all duration-300 ${
                                        isLatUnlocked 
                                            ? 'text-amber-500 hover:text-amber-600' 
                                            : 'text-success-500 hover:text-success-600'
                                    }`}
                                    title={isLatUnlocked ? "Lock Latitude" : "Unlock Latitude"}
                                >
                                    <LockIcon className={`size-3.5 ${isLatUnlocked ? 'opacity-60' : ''}`} />
                                </button>
                            </div>
                            <div className="relative">
                                <NumberInput
                                    label="Longitude"
                                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    value={qrForm.longitude}
                                    onChange={(val) => setQrForm(prev => ({ ...prev, longitude: Number(val) }))}
                                    disabled={!isLngUnlocked}
                                    step="any"
                                />
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsLngUnlocked(!isLngUnlocked);
                                    }}
                                    className={`absolute top-0 right-0 p-1 flex items-center justify-center transition-all duration-300 ${
                                        isLngUnlocked 
                                            ? 'text-amber-500 hover:text-amber-600' 
                                            : 'text-success-500 hover:text-success-600'
                                    }`}
                                    title={isLngUnlocked ? "Lock Longitude" : "Unlock Longitude"}
                                >
                                    <LockIcon className={`size-3.5 ${isLngUnlocked ? 'opacity-60' : ''}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Notes (Optional)</label>
                            <textarea 
                                value={qrForm.notes}
                                onChange={(e) => setQrForm(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Add context for this scan..."
                                rows={2}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block">Select Scanning Mode</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setQrMode("scan")}
                                    className={`relative group p-6 rounded-2xl border-2 transition-all text-left ${
                                        qrMode === "scan" 
                                            ? "border-brand-500 bg-brand-50/30 dark:bg-brand-500/10 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500" 
                                            : "border-gray-100 bg-white hover:border-brand-200 dark:border-white/5 dark:bg-white/[0.02]"
                                    }`}
                                >
                                    <div className={`size-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                                        qrMode === "scan" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400 dark:bg-white/5"
                                    }`}>
                                        <VideoIcon className="size-6" />
                                    </div>
                                    <h3 className={`font-bold transition-colors ${qrMode === "scan" ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-gray-200"}`}>Scan User QR</h3>
                                    <p className="text-xs text-gray-500 mt-1">Record attendance by scanning student/employee QR cards.</p>
                                    {qrMode === "scan" && (
                                        <div className="absolute top-4 right-4 animate-in zoom-in">
                                            <div className="size-5 rounded-full bg-brand-500 flex items-center justify-center">
                                                <svg className="size-3 text-white fill-current" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                                            </div>
                                        </div>
                                    )}
                                </button>

                                <button
                                    onClick={() => setQrMode("show")}
                                    className={`relative group p-6 rounded-2xl border-2 transition-all text-left ${
                                        qrMode === "show" 
                                            ? "border-brand-500 bg-brand-50/30 dark:bg-brand-500/10 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500" 
                                            : "border-gray-100 bg-white hover:border-brand-200 dark:border-white/5 dark:bg-white/[0.02]"
                                    }`}
                                >
                                    <div className={`size-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                                        qrMode === "show" ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400 dark:bg-white/5"
                                    }`}>
                                        <GridIcon className="size-6" />
                                    </div>
                                    <h3 className={`font-bold transition-colors ${qrMode === "show" ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-gray-200"}`}>Show Our QR</h3>
                                    <p className="text-xs text-gray-500 mt-1">Display a QR for students to scan with their mobile application.</p>
                                    {qrMode === "show" && (
                                        <div className="absolute top-4 right-4 animate-in zoom-in">
                                            <div className="size-5 rounded-full bg-brand-500 flex items-center justify-center">
                                                <svg className="size-3 text-white fill-current" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button 
                            variant="primary" 
                            className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl"
                            onClick={() => setIsQrActivated(true)}
                        >
                            {qrMode === "scan" ? "Activate Scanner" : "Generate QR Point"}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in zoom-in duration-300">
                        {qrMode === "scan" ? (
                            <div className="space-y-4">
                                <QrScanner 
                                    onScanSuccess={(text) => setQrForm(prev => ({ ...prev, qrData: text }))} 
                                />
                                {qrForm.qrData && (
                                    <div className="p-4 bg-success-50 dark:bg-success-500/10 border border-success-100 dark:border-success-500/20 rounded-xl animate-in fade-in zoom-in-95">
                                        <p className="text-[10px] font-bold text-success-600 uppercase mb-1">Scanned Identity</p>
                                        <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all">{qrForm.qrData}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 py-4">
                                <div className="p-8 bg-white rounded-[2rem] shadow-2xl ring-1 ring-gray-100 dark:ring-white/5">
                                     <QRCode 
                                        value={JSON.stringify({
                                            type: "ATTENDANCE_POINT",
                                            deviceId: qrForm.deviceId,
                                            eventId: qrForm.eventId || "GLOBAL",
                                            latitude: qrForm.latitude,
                                            longitude: qrForm.longitude,
                                            mode: attendanceMode
                                        })}
                                        size={220}
                                        className="animate-in fade-in duration-700"
                                     />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="font-bold text-gray-900 dark:text-white text-lg">Attendance Check-in Point</p>
                                    <p className="text-xs text-gray-500 max-w-xs mx-auto">Active and ready. Students can scan this with their mobile app.</p>
                                </div>
                            </div>
                        )}

                        {/* Context Banner */}
                        <div className="relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 dark:bg-white/[0.03] dark:border-white/5 p-4">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                                        <FilterIcon className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Active Context</p>
                                        {isDetailLoading ? (
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                                                <span className="text-gray-300">•</span>
                                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                                            </div>
                                        ) : (
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {selectedClassDetail?.name || selectedEventDetail?.name || "Global / All Records"}
                                                    </span>
                                                    {(selectedClassDetail || selectedEventDetail) && (
                                                        <Badge color="success" size="sm" className="h-4 px-1.5 text-[9px] uppercase tracking-tighter">
                                                            Verified
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                    {selectedClassDetail ? (
                                                        <>
                                                            <span>Code: {selectedClassDetail.code}</span>
                                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                                            <span>Grade: {selectedClassDetail.grade?.name || 'N/A'}</span>
                                                            {selectedClassDetail.major && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                    <span>Major: {selectedClassDetail.major.name}</span>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : selectedEventDetail ? (
                                                        <>
                                                            <span>Type: {selectedEventDetail.eventType}</span>
                                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                                            <span className="capitalize">Status: {selectedEventDetail.isActive ? 'Active' : 'Inactive'}</span>
                                                            {selectedEventDetail.location && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                    <span>Location: {selectedEventDetail.location}</span>
                                                                </>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span>No specific filters applied. Records will be attributed globally.</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => setIsQrActivated(false)} className="h-8 py-0">
                                    Change Mode
                                </Button>
                             </div>
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>
        </SmoothHeight>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        className="max-w-5xl"
        title="Update Record"
        description={`Modifying record for ${selectedRecord?.user?.name || "Student"}`}
        footer={
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleUpdate} isLoading={updateMutation.isPending}>
                    Save Changes
                </Button>
            </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-2">
            {/* Left Column: Form Fields */}
            <div className="space-y-5">
                {/* User & Date (Read-only/Disabled context) */}
                <div className="grid grid-cols-2 gap-4">
                    <SearchableAsyncSelect
                         label="User"
                         labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                         value={manualForm.userId}
                         onChange={() => {}} // Disabled in Edit
                         options={userOptions}
                         onSearch={searchUsers}
                         placeholder={selectedRecord?.user?.name || "Select user..."}
                         isLoading={isSearching}
                         disabled
                    />
                     <DatePicker
                        label="Date"
                        labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                        value={manualForm.date}
                        onChange={(val) => setManualForm(prev => ({ ...prev, date: val }))}
                    />
                </div>

                {/* Time & Status */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</label>
                        <input 
                            type="time" 
                            step="1"
                            value={manualForm.clockIn}
                            onChange={(e) => setManualForm(prev => ({ ...prev, clockIn: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</label>
                         <input 
                            type="time" 
                            step="1"
                            value={manualForm.clockOut}
                            onChange={(e) => setManualForm(prev => ({ ...prev, clockOut: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        />
                    </div>
                </div>

                 <CustomSelect
                    label="Status Label"
                    labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                    value={manualForm.statusLabel}
                    onChange={(val) => setManualForm(prev => ({ ...prev, statusLabel: String(val) as "present" | "late" | "absent" | "sick" | "excused" }))}
                    options={[
                        { label: "Present (Hadir)", value: "present" },
                        { label: "Sick (Sakit)", value: "sick" },
                        { label: "Excused (Izin)", value: "excused" },
                        { label: "Absent (Alpha)", value: "absent" },
                        { label: "Late (Terlambat)", value: "late" },
                    ]}
                />

                {/* Context: Class / Event */}
                <div className="grid grid-cols-2 gap-4">
                    <SearchableAsyncSelect
                        label="Target Class"
                        labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                        value={manualForm.classId || ""}
                        onChange={(val) => setManualForm(prev => ({ ...prev, classId: String(val) }))}
                        options={classes.map(c => ({ label: c.name, value: String(c.id), subLabel: c.code }))}
                        onSearch={() => {}}
                        placeholder="Select class..."
                    />
                    <SearchableAsyncSelect
                        label="Associated Event"
                        labelClassName="text-xs font-medium text-gray-500 uppercase tracking-wider"
                        value={manualForm.eventId || ""}
                        onChange={(val) => setManualForm(prev => ({ ...prev, eventId: String(val) }))}
                        options={eventOptions}
                        onSearch={setEventSearch}
                        placeholder="Search event name..."
                    />
                </div>

                 {/* Location Controls with Lock */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                             <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">LATITUDE</label>
                             <button 
                                onClick={() => setIsLatUnlocked(!isLatUnlocked)} 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isLatUnlocked ? "text-success-600 hover:text-success-700" : "text-gray-400 hover:text-gray-500"}`}
                                type="button" 
                            >
                                {isLatUnlocked ? (
                                    <div className="flex items-center gap-1.5">
                                        <span>Unlocked</span>
                                        <LockIcon className="size-3" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <span>Locked</span>
                                        <LockIcon className="size-3" />
                                    </div>
                                )}
                             </button>
                        </div>
                         <input
                            type="number"
                            step="any"
                            value={manualForm.latitude}
                            disabled={!isLatUnlocked}
                            onChange={(e) => setManualForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                            className={`w-full rounded-xl border ${!isLatUnlocked ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-brand-500 ring-2 ring-brand-500/20'} px-4 py-2.5 text-sm transition-all focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white`}
                        />
                    </div>
                     <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                             <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">LONGITUDE</label>
                              <button 
                                onClick={() => setIsLngUnlocked(!isLngUnlocked)} 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isLngUnlocked ? "text-success-600 hover:text-success-700" : "text-gray-400 hover:text-gray-500"}`}
                                type="button" 
                            >
                                {isLngUnlocked ? (
                                    <div className="flex items-center gap-1.5">
                                        <span>Unlocked</span>
                                        <LockIcon className="size-3" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <span>Locked</span>
                                        <LockIcon className="size-3" />
                                    </div>
                                )}
                             </button>
                        </div>
                        <input
                            type="number"
                            step="any"
                            value={manualForm.longitude}
                             disabled={!isLngUnlocked}
                            onChange={(e) => setManualForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                            className={`w-full rounded-xl border ${!isLngUnlocked ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-brand-500 ring-2 ring-brand-500/20'} px-4 py-2.5 text-sm transition-all focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white`}
                        />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Officer Notes</label>
                    <textarea 
                        value={manualForm.notes}
                        onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Why is this record being modified?"
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none"
                    />
                </div>
            </div>

             {/* Right Column: Camera */}
             <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Face Validation {manualForm.photo ? "(Captured)" : "*"}</label>
                     <div className="relative w-full aspect-[3/4] max-w-[320px] mx-auto bg-gray-100 dark:bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
                        {isCameraOpen ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                            <canvas ref={canvasRef} width={300} height={400} className="hidden" />
                            <button 
                                type="button"
                                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-20"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const newMode = facingMode === "user" ? "environment" : "user";
                                    setFacingMode(newMode);
                                    startCamera(newMode);
                                }}
                                title="Switch Camera"
                            >
                                <ArrowPathIcon className="size-5" />
                            </button>
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                                <Button type="button" variant="secondary" size="sm" onClick={(e) => {
                                    e.preventDefault();
                                    const stream = videoRef.current?.srcObject as MediaStream;
                                    stream?.getTracks().forEach(track => track.stop());
                                    setIsCameraOpen(false);
                                }}>Cancel</Button>
                                <Button type="button" variant="primary" size="sm" onClick={(e) => {
                                    e.preventDefault();
                                    const video = videoRef.current;
                                    const canvas = canvasRef.current;
                                    if (video && canvas) {
                                        const context = canvas.getContext('2d');
                                        if (context) {
                                            if (facingMode === 'user') {
                                                context.translate(300, 0);
                                                context.scale(-1, 1);
                                            }
                                            context.drawImage(video, 0, 0, 300, 400); // Draw 3:4 portrait
                                            if (facingMode === 'user') {
                                                context.setTransform(1, 0, 0, 1, 0, 0);
                                            }
                                            canvas.toBlob((blob) => {
                                                if (blob) {
                                                    setManualForm(prev => ({ ...prev, photo: blob }));
                                                    const stream = video.srcObject as MediaStream;
                                                    stream?.getTracks().forEach(track => track.stop());
                                                    setIsCameraOpen(false);
                                                }
                                            }, 'image/jpeg', 0.8);
                                        }
                                    }
                                }}>Capture</Button>
                            </div>
                        </>
                    ) : manualForm.photo ? (
                        <div className="relative w-full h-full group">
                             <img src={URL.createObjectURL(manualForm.photo)} alt="Preview" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button variant="outline" size="sm" className="bg-white text-gray-900 border-white" onClick={() => setManualForm(prev => ({ ...prev, photo: null }))}>Retake</Button>
                             </div>
                        </div>
                    ) : selectedRecord && ((selectedRecord as any).photoUrl || (selectedRecord as any).photoEvidenceUrl || (selectedRecord as any).photoEvidence) ? (
                        <div className="relative w-full h-full group">
                             <img 
                                src={
                                    ((selectedRecord as any).photoUrl || (selectedRecord as any).photoEvidenceUrl || (selectedRecord as any).photoEvidence)?.startsWith('/') 
                                        ? `http://localhost:3000${(selectedRecord as any).photoUrl || (selectedRecord as any).photoEvidenceUrl || (selectedRecord as any).photoEvidence}`
                                        : ((selectedRecord as any).photoUrl || (selectedRecord as any).photoEvidenceUrl || (selectedRecord as any).photoEvidence)
                                } 
                                alt="Existing Evidence" 
                                className="w-full h-full object-cover" 
                             />
                             <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                 <span className="text-white text-xs font-bold shadow-sm">Existing Evidence</span>
                                 <Button variant="outline" size="sm" className="bg-white text-gray-900 border-white font-semibold" onClick={() => setIsCameraOpen(true)}>Take New Photo</Button>
                             </div>
                        </div>
                    ) : (
                        <div className="text-center p-6">
                            <div className="size-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <VideoIcon className="size-8" />
                            </div>
                             <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Take Photo</h4>
                             <p className="text-xs text-gray-500 mb-4">Required for validation</p>
                            <Button type="button" variant="secondary" size="sm" onClick={async (e) => {
                                e.preventDefault();
                                setIsCameraOpen(true);
                                startCamera(facingMode);
                            }}>Open Camera</Button>
                        </div>
                    )}
                     </div>
                </div>
                 <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-100 dark:border-blue-500/20">
                     <div className="flex gap-3">
                         <div className="shrink-0 mt-0.5 text-blue-500">
                             <LockIcon className="size-4" />
                         </div>
                         <div className="space-y-1">
                             <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Validation Rules</h4>
                             <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">
                                 Please ensure the photo clearly shows the student's face. If editing location, ensure you unlock the coordinates first.
                             </p>
                         </div>
                     </div>
                 </div>
            </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        className="max-w-2xl"
        title="Attendance Details"
        description="Comprehensive overview of student attendance record."
        footer={
            <div className="flex justify-end gap-3 w-full">
                <Button 
                    variant="outline" 
                    className="mr-auto text-error-600 border-error-100 hover:bg-error-50"
                    onClick={async () => {
                        const confirmed = await confirm({
                            title: "Delete Attendance Record",
                            message: "Are you sure you want to delete this specific record?",
                            variant: "delete"
                        });
                        if (confirmed && selectedRecord?.public_id) {
                            await deleteMutation.mutateAsync(selectedRecord.public_id);
                            setIsDetailModalOpen(false);
                            showSuccess("Record deleted successfully");
                        }
                    }}
                >
                    <TrashIcon className="size-4 mr-2" />
                    Delete
                </Button>
                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
                <Button 
                    variant="primary" 
                    onClick={() => {
                        setIsDetailModalOpen(false);
                        const lat = selectedRecord?.latitude || 0;
                        const lng = selectedRecord?.longitude || 0;
                        setManualForm({
                            userId: selectedRecord?.userId || "",
                            date: selectedRecord?.date || "",
                            clockIn: selectedRecord?.clockIn ? format(parseISO(selectedRecord.clockIn), "HH:mm:ss") : "",
                            clockOut: selectedRecord?.clockOut ? format(parseISO(selectedRecord.clockOut), "HH:mm:ss") : "",
                            statusLabel: (selectedRecord?.statusLabel?.toLowerCase() || "present") as "present" | "late" | "absent" | "sick" | "excused",
                            notes: selectedRecord?.notes || "",
                            eventId: selectedRecord?.eventId || "",
                            latitude: lat,
                            longitude: lng,
                            classId: selectedRecord?.classId ? String(selectedRecord.classId) : "",
                            photo: null
                        });
                        // Initialize lock states based on coordinates presence
                        if (lat !== 0) setIsLatUnlocked(false);
                        if (lng !== 0) setIsLngUnlocked(false);
                        setIsEditModalOpen(true);
                    }}
                >
                    Edit Record
                </Button>
            </div>
        }
      >
        {selectedRecord && (
          <div className="space-y-6 py-4">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-24 aspect-[3/4] rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center overflow-hidden ring-4 ring-gray-100 dark:ring-white/5 shadow-xl shrink-0">
                        {selectedRecord.user?.photo ? (
                            <img src={selectedRecord.user.photo} alt={selectedRecord.user.name} className="size-full object-cover" />
                        ) : (
                            <span className="text-3xl font-bold uppercase">{selectedRecord.user?.name?.charAt(0)}</span>
                        )}
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white line-height-tight">{selectedRecord.user?.name}</h2>
                        <div className="flex items-center gap-2">
                            <Badge color={getStatusColor(selectedRecord.statusLabel || undefined)}>{selectedRecord.status?.name || selectedRecord.statusLabel}</Badge>
                            <span className="text-xs text-gray-400 font-mono tracking-wider">{selectedRecord.user?.public_id?.split('-')[0]}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-[0.2em]">Method</span>
                    <div className="flex items-center justify-end gap-2 mt-1">
                        <MethodIcon method={selectedRecord.method || ""} />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{selectedRecord.method}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</span>
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                        <CalenderIcon className="size-4 text-brand-500" />
                        <span>{format(new Date(selectedRecord.date), "MMM dd, yyyy")}</span>
                    </div>
                </div>
                <div className="space-y-1 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Metric Status</span>
                    <div className="flex items-center gap-2">
                        {selectedRecord.isLate ? (
                            <>
                                <div className="size-2 rounded-full bg-error-500"></div>
                                <span className="text-sm font-bold text-error-600">Late {selectedRecord.lateMinutes}m</span>
                            </>
                        ) : selectedRecord.isEarlyLeave ? (
                            <>
                                <div className="size-2 rounded-full bg-warning-500"></div>
                                <span className="text-sm font-bold text-warning-600">Early {selectedRecord.earlyLeaveMinutes}m</span>
                            </>
                        ) : (
                            <>
                                <div className="size-2 rounded-full bg-success-500"></div>
                                <span className="text-sm font-bold text-success-600">On Time</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="space-y-1 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Academic Year</span>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-400 font-medium">
                        <span className="size-2 rounded-full bg-brand-500/20 ring-1 ring-brand-500"></span>
                        <span>{selectedRecord.academicYear?.name || "N/A"}</span>
                    </div>
                </div>
            </div>

            {(() => {
                const hasLocation = selectedRecord.latitude != null && selectedRecord.longitude != null && (selectedRecord.latitude !== 0 || selectedRecord.longitude !== 0);
                
                if (!hasLocation) {
                    return (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 text-center dark:border-white/[0.05] dark:bg-white/[0.02]">
                            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5">
                                <MapPinIcon className="size-6" />
                            </div>
                            <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Location Not Recorded</h3>
                            <p className="mt-1 text-xs text-gray-500">This attendance record does not contain GPS coordinates.</p>
                        </div>
                    );
                }

                const schoolLat = parseFloat(settingsResponse?.data?.find((s: any) => s.key === 'SCHOOL_LATITUDE')?.value || '0');
                const schoolLng = parseFloat(settingsResponse?.data?.find((s: any) => s.key === 'SCHOOL_LONGITUDE')?.value || '0');
                const isLocationValid = schoolLat !== 0 && schoolLng !== 0 && selectedRecord.latitude !== 0 && selectedRecord.longitude !== 0;
                const distance = isLocationValid ? Math.round(calculateDistance(selectedRecord.latitude, selectedRecord.longitude, schoolLat, schoolLng)) : null;
                const radiusStr = settingsResponse?.data?.find((s: any) => s.key === 'ATTENDANCE_RADIUS')?.value;
                const radius = radiusStr ? parseFloat(radiusStr) : 50;
                const isWithinZone = distance !== null && distance <= radius;

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 p-5 rounded-2xl border border-gray-100 bg-white shadow-sm dark:bg-white/[0.02] dark:border-white/[0.05]">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="size-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center dark:bg-blue-500/10">
                                    <MapPinIcon className="size-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Recorded Location</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">GPS Coordinates</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Lat:</span>
                                    <span className="font-mono text-gray-900 dark:text-gray-200">{Number(selectedRecord.latitude).toFixed(6)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Lng:</span>
                                    <span className="font-mono text-gray-900 dark:text-gray-200">{Number(selectedRecord.longitude).toFixed(6)}</span>
                                </div>
                            </div>
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${selectedRecord.latitude},${selectedRecord.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-gray-50 hover:bg-gray-100 text-brand-600 text-xs font-bold rounded-lg border border-gray-200 transition-colors dark:bg-white/[0.03] dark:border-white/[0.05] dark:hover:bg-white/[0.08]"
                            >
                                Open in Google Maps
                            </a>
                        </div>

                        <div className="space-y-3 p-5 rounded-2xl border border-gray-100 bg-white shadow-sm dark:bg-white/[0.02] dark:border-white/[0.05]">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="size-8 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center dark:bg-brand-500/10">
                                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Distance to School</h3>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Geo-Fencing Status</p>
                                </div>
                            </div>
                            
                            {isLocationValid ? (
                                <div className="flex flex-col h-full justify-center space-y-3 mt-4">
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{distance}</span>
                                        <span className="text-sm font-medium text-gray-500 pb-0.5">meters away</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isWithinZone ? (
                                            <Badge color="success" className="px-2 py-0.5 text-[10px]">IN ZONE</Badge>
                                        ) : (
                                            <Badge color="error" className="px-2 py-0.5 text-[10px]">OUT OF ZONE</Badge>
                                        )}
                                        <span className="text-xs text-gray-400">Radius limit: {radius}m</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full justify-center items-center text-center p-4 bg-gray-50 rounded-xl dark:bg-white/[0.02]">
                                    <p className="text-xs text-gray-500">School coordinates not configured properly.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 p-5 rounded-2xl bg-success-50/30 border border-success-100 dark:bg-success-500/5 dark:border-success-500/10 transition-all hover:bg-success-50/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-success-700 dark:text-success-400 uppercase tracking-widest">Clock In</span>
                        <TimeIcon className="size-4 text-success-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {selectedRecord.clockIn ? format(parseISO(selectedRecord.clockIn), "HH:mm:ss") : "--:--:--"}
                    </p>
                    <p className="text-[10px] text-success-600 font-medium uppercase truncate">Source: {selectedRecord.method}</p>
                </div>
                <div className="space-y-3 p-5 rounded-2xl bg-error-50/30 border border-error-100 dark:bg-error-500/5 dark:border-error-500/10 transition-all hover:bg-error-50/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-error-700 dark:text-error-400 uppercase tracking-widest">Clock Out</span>
                        <TimeIcon className="size-4 text-error-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {selectedRecord.clockOut ? format(parseISO(selectedRecord.clockOut), "HH:mm:ss") : "--:--:--"}
                    </p>
                    <p className="text-[10px] text-error-600 font-medium uppercase truncate">Processed locally</p>
                </div>
            </div>

            {selectedRecord.notes && (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Officer Notes</label>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm text-gray-600 dark:border-white/[0.05] dark:bg-white/[0.01] dark:text-gray-400 italic font-medium leading-relaxed">
                        "{selectedRecord.notes}"
                    </div>
                </div>
            )}
            
            {/* Display captured photo evidence if the API returns it */}
            {((selectedRecord as any).photoUrl || (selectedRecord as any).photoEvidenceUrl || (selectedRecord as any).photoEvidence) && (
                <div className="space-y-2 mt-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                        <VideoIcon className="size-3.5" /> 
                        Photo Evidence
                    </label>
                    <div className="aspect-[3/4] max-w-[320px] mx-auto rounded-2xl border border-gray-100 bg-gray-50/50 p-2 dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden shadow-md">
                        <img 
                            src={
                                ((selectedRecord as any).photoUrl || (selectedRecord as any).photoEvidenceUrl || (selectedRecord as any).photoEvidence)?.startsWith('/') 
                                    ? `http://localhost:3000${(selectedRecord as any).photoUrl || (selectedRecord as any).photoEvidenceUrl || (selectedRecord as any).photoEvidence}`
                                    : ((selectedRecord as any).photoUrl || (selectedRecord as any).photoEvidenceUrl || (selectedRecord as any).photoEvidence)
                            } 
                            alt="Attendance Capture Evidence" 
                            className="w-full h-full object-cover rounded-xl"
                        />
                    </div>
                </div>
            )}
          </div>
        )}
      </Modal>

        <ConfirmDialog {...confirmState} />
      </div>
    </>
  );
};

export default AttendanceList;
