import React, { useState, useEffect, useRef } from "react";
import { useAttendanceList, useAttendanceStatuses } from "../../api/hooks/useAttendance";
import { useEvents } from "../../api/hooks/useEvents";
import { useClasses, useAcademicYears, useMajors } from "../../api/hooks/useAcademic";
import { AttendanceRecord } from "../../api/types/attendance";
import { Class } from "../../api/types/academic";
import { Event } from "../../api/types/events";
import { academicService } from "../../api/services/academicService";
import { eventService } from "../../api/services/eventService";
import { useDebounce } from "../../hooks/useDebounce";
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
    CalenderIcon,
    TimeIcon,
    UserIcon,
    FilterIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    LockIcon,
    CheckCircleIcon,
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
import { toast } from "react-hot-toast";
import { SmoothHeight } from "../../components/atoms/SmoothHeight";
import QrScanner from "../../components/molecules/QrScanner";
import QRCode from "react-qr-code";
import { useAuthStore } from "../../store/authStore";

const MethodIcon = ({ method }: { method?: string }) => {
    switch (method?.toUpperCase()) {
        case "FACE": return <VideoIcon className="size-3.5" />;
        case "QR_CODE": return <GridIcon className="size-3.5" />;
        case "MANUAL": return <ManualIcon className="size-3.5" />;
        default: return <GridIcon className="size-3.5" />;
    }
};

const AttendanceList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [classId, setClassId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [attendanceType, setAttendanceType] = useState<string>("");
  const [eventId, setEventId] = useState("");
  const [lateMinutes, setLateMinutes] = useState("");
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [filterTab, setFilterTab] = useState<"academic" | "event" | "general">("academic");

  // Filter Context Logic
  // Automatically switch tab based on existing state if needed, or just let users toggle


  const debouncedSearch = useDebounce(search, 500);

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "qr_scan">("manual");
  const [qrMode, setQrMode] = useState<"scan" | "show">("scan");
  const [isQrActivated, setIsQrActivated] = useState(false);
  const [isLatUnlocked, setIsLatUnlocked] = useState(false);
  const [isLngUnlocked, setIsLngUnlocked] = useState(false);
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
    userId: debouncedSearch || undefined,
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
          toast.error("Location access denied. Coordinates set to 0.");
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
    if (!manualForm.userId) return toast.error("Please select a user");
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
      toast.success("Record created/updated manually by admin");
      setIsCreateModalOpen(false);
      resetManualForm();
      setManualForm(prev => ({ ...prev, photo: null })); // Reset photo specifically
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Failed to create manual record");
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
                toast.success("Attendance record updated successfully");
            },
            onError: (error: unknown) => {
                const err = error as { response?: { data?: { message?: string } } };
                toast.error(err.response?.data?.message || "Failed to update record");
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
                    toast.success("User checked out successfully");
                },
                onError: (error: unknown) => {
                    const err = error as { response?: { data?: { message?: string } } };
                    toast.error(err.response?.data?.message || "Failed to check out user");
                }
            });
        }
    };

  const handleQrScan = async () => {
    if (!qrForm.qrData) return toast.error("Please enter QR data");
    
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
      toast.success("Attendance processed via QR scan (Automated)");
      setIsCreateModalOpen(false);
      resetQrForm();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || "Failed to process QR scan");
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
      deleteMutation.mutate(id);
    }
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Records</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Monitor daily attendance logs.</p>
          </div>
          {/* Only show Add Record button for admin and staff */}
          {(() => {
            const user = useAuthStore.getState().user;
            // Strict role check
            if (!user?.roles || user.roles.length === 0) return null;
            
            const roleNames = user.roles.map(r => r.name.toLowerCase());
            
            // Check for Admin (any kind) or Staff
            const isAdminOrStaff = roleNames.some(role => 
              role === 'admin' || role.includes('admin') || role === 'staff' || role.includes('staff')
            );
            
            return isAdminOrStaff ? (
              <Button 
                onClick={() => {
                  resetManualForm();
                  resetQrForm();
                  setIsCreateModalOpen(true);
                }} 
                startIcon={<PlusIcon className="size-4" />}
              >
                Add Record
              </Button>
            ) : null;
          })()}
        </div>

        {/* Filters */}
        <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Search Student</label>
                    <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                            <GridIcon className="size-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Student name or ID..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-end">
                    <CustomSelect
                        label="Status"
                        className="w-40"
                        value={statusId}
                        onChange={(val) => { setStatusId(String(val)); setPage(1); }}
                        placeholder="All Statuses"
                        options={statusOptions}
                    />

                    <DatePicker
                        label="Date"
                        className="w-44"
                        value={startDate}
                        onChange={(date) => { setStartDate(date); setPage(1); }}
                        placeholder="Select date"
                    />

                    <Button 
                        variant="outline" 
                        onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                        className={`h-[42px] px-4 transition-all ${isFiltersExpanded ? 'bg-brand-50/50 dark:bg-brand-500/5 border-brand-200 dark:border-brand-500/20 text-brand-500 shadow-sm' : ''}`}
                    >
                        <FilterIcon className="mr-2 size-4" />
                        {isFiltersExpanded ? 'Hide Filters' : 'More Filters'}
                        {isFiltersExpanded ? <ChevronUpIcon className="ml-2 size-3" /> : <ChevronDownIcon className="ml-2 size-3" />}
                    </Button>
                </div>
            </div>

            <SmoothHeight>
                {isFiltersExpanded && (
                    <div className="space-y-6 rounded-2xl border border-dashed border-gray-200 p-6 dark:border-white/10 bg-gray-50/30 dark:bg-white/[0.01]">
                        {/* Segmented Control / Radio Tabs */}
                        <div className="flex flex-col gap-3">
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
                                            // Reset other contexts
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

                        {/* Context-Specific Forms */}
                        <SmoothHeight>
                            {filterTab === 'academic' && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <CustomSelect
                                        label="Mode"
                                        value={attendanceType}
                                        onChange={(val) => { setAttendanceType(String(val)); setPage(1); }}
                                        options={[
                                            { label: "Daily & Class", value: "" },
                                            { label: "Daily Attendance", value: "DAILY" },
                                            { label: "Class Attendance", value: "CLASS" },
                                        ]}
                                    />
                                    <CustomSelect
                                        label="Class"
                                        value={classId}
                                        onChange={(val) => { setClassId(String(val)); setPage(1); }}
                                        options={[{ label: "All Classes", value: "" }, ...classes.map(c => ({ label: c.name, value: String(c.id) }))]}
                                    />
                                    <CustomSelect
                                        label="Major"
                                        value={majorId}
                                        onChange={(val) => { setMajorId(String(val)); setPage(1); }}
                                        options={[{ label: "All Majors", value: "" }, ...majors.map(m => ({ label: m.name, value: String(m.id) }))]}
                                    />
                                    <CustomSelect
                                        label="Academic Year"
                                        value={academicYearId}
                                        onChange={(val) => { setAcademicYearId(String(val)); setPage(1); }}
                                        options={[{ label: "All Years", value: "" }, ...academicYears.map(ay => ({ label: ay.code, value: String(ay.id) }))]}
                                    />
                                </div>
                            )}

                            {filterTab === 'event' && (
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <CustomSelect
                                        label="Attendance Event"
                                        className="lg:col-span-2"
                                        value={eventId}
                                        onChange={(val) => { setEventId(String(val)); setPage(1); }}
                                        options={[{ label: "Select Event", value: "" }, ...events.map(e => ({ label: e.name, value: String(e.id) }))]}
                                    />
                                </div>
                            )}

                            {filterTab === 'general' && (
                                <div className="p-8 text-center bg-white/50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-300">
                                    <p className="text-sm text-gray-500">Using global filters (Date, Status, Search). Click a context tab to filter by specific criteria.</p>
                                </div>
                            )}
                        </SmoothHeight>

                        {/* Common Filters Bar */}
                        <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
                                <DatePicker
                                    label="End Date"
                                    value={endDate}
                                    onChange={(date) => { setEndDate(date); setPage(1); }}
                                    placeholder="Range end date"
                                />
                                <NumberInput
                                    label="Late Minutes Threshold"
                                    placeholder="Minutes..."
                                    value={lateMinutes}
                                    onChange={(val) => { setLateMinutes(val); setPage(1); }}
                                />
                                <div className="lg:col-span-2 flex justify-end">
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => {
                                            setSearch("");
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
                                        className="text-gray-500"
                                    >
                                        Reset All Filters
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SmoothHeight>
        </div>

        {/* Table - Mobile Scrollable, Desktop Fixed */}
        <div className="w-full overflow-x-auto lg:overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User & Identity</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance Details</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status & Source</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading records...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.public_id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
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
                            <span className="text-[10px] text-gray-500 font-medium truncate tracking-tight">{record.user?.public_id?.split('-')[0]}</span>
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
                        <div className="flex items-center justify-end gap-1">
                             {record.clockIn && !record.clockOut && (
                                <button
                                    onClick={() => handleQuickCheckOut(record)}
                                    className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-all"
                                    title="Quick Check Out"
                                >
                                    <CheckCircleIcon className="size-4" />
                                </button>
                             )}
                             <button
                                 onClick={() => { setSelectedRecord(record); setIsDetailModalOpen(true); }}
                                 className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-all"
                                 title="View Details"
                             >
                                 <EyeIcon className="size-4" />
                             </button>
                             <button
                                 onClick={() => { 
                                     setSelectedRecord(record); 
                                     setManualForm({
                                         userId: record.userId,
                                         date: record.date,
                                         clockIn: record.clockIn ? format(parseISO(record.clockIn), "HH:mm:ss") : "",
                                         clockOut: record.clockOut ? format(parseISO(record.clockOut), "HH:mm:ss") : "",
                                         statusLabel: (record.statusLabel?.toLowerCase() || "present") as "present" | "late" | "absent" | "sick" | "excused",
                                         notes: record.notes || "",
                                         eventId: record.eventId || "",
                                          latitude: record.latitude || 0,
                                          longitude: record.longitude || 0,
                                          classId: record.classId || "",
                                          photo: null
                                      });
                                     setIsEditModalOpen(true); 
                                 }}
                                 className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-all"
                                 title="Edit"
                             >
                                 <EditIcon className="size-4" />
                             </button>
                             <button
                                 onClick={() => handleDelete(record.public_id!)}
                                 className="p-2 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-all"
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
                     <div className="relative w-full aspect-square bg-gray-100 dark:bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
                        {isCameraOpen ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} width={300} height={400} className="hidden" />
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                                <Button variant="secondary" size="sm" onClick={() => {
                                    const stream = videoRef.current?.srcObject as MediaStream;
                                    stream?.getTracks().forEach(track => track.stop());
                                    setIsCameraOpen(false);
                                }}>Cancel</Button>
                                <Button variant="primary" size="sm" onClick={() => {
                                    const video = videoRef.current;
                                    const canvas = canvasRef.current;
                                    if (video && canvas) {
                                        const context = canvas.getContext('2d');
                                        if (context) {
                                            context.drawImage(video, 0, 0, 300, 300); // Draw square
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
                    ) : (
                        <div className="text-center p-6">
                            <div className="size-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <VideoIcon className="size-8" />
                            </div>
                             <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Take Photo</h4>
                             <p className="text-xs text-gray-500 mb-4">Required for validation</p>
                            <Button variant="secondary" size="sm" onClick={async () => {
                                setIsCameraOpen(true);
                                try {
                                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                    if (videoRef.current) {
                                        videoRef.current.srcObject = stream;
                                    }
                                } catch (err) {
                                    console.error("Error accessing camera:", err);
                                    setIsCameraOpen(false);
                                    toast.error("Failed to access camera");
                                }
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
            <div className="flex justify-end gap-3">
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
          </div>
        )}
      </Modal>

        <ConfirmDialog {...confirmState} />
      </div>
    </>
  );
};

export default AttendanceList;
