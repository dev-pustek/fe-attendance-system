import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useEvents, useEventsInfinite, useEventMutation } from "../../api/hooks/useEvents";
import { Event, CreateEventDto, UpdateEventDto } from "../../api/types/events";
import { useNavigate } from "react-router";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import TableToolbar from "../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../components/molecules/SkeletonRow";
import Modal from "../../components/molecules/Modal";
import CustomSelect from "../../components/molecules/CustomSelect";
import DatePicker from "../../components/molecules/DatePicker";
import NumberInput from "../../components/molecules/NumberInput";
import Input from "../../components/atoms/InputField";
import Label from "../../components/atoms/Label";
import Checkbox from "../../components/atoms/Checkbox";
import Badge from "../../components/atoms/Badge";
import Dropdown from "../../components/molecules/Dropdown";
import DropdownItem from "../../components/atoms/DropdownItem";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import { showSuccess, showError } from "../../utils/toast";
import EventCard from "./EventCard";
import ManageInvitationsModal from "../../components/organisms/Events/ManageInvitationsModal";
import DayEventsModal from "../../components/organisms/Events/DayEventsModal";
import CalendarWidget from "../../components/molecules/Calendar/CalendarWidget";
import { EventInput } from "@fullcalendar/core";
import TableActionMenu from "../../components/molecules/TableActionMenu";
import { useDebounce } from "../../hooks/useDebounce";
import {
  PlusIcon, PencilIcon, TrashBinIcon, ChevronLeftIcon,
  ChevronUpIcon, ChevronDownIcon, AngleRightIcon,
  GridIcon, CalenderIcon, TableIcon, ListIcon,
  UserIcon, TimeIcon, GroupIcon, CloseIcon, FilterIcon, SearchIcon
} from "../../components/atoms/Icons";
import Button from "../../components/atoms/Button";
import Switch from "../../components/atoms/Switch";

// ─── useIsMobile ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const DataActionsMenu = ({ 
    onExportExcel, 
    onExportPdf, 
    onImportClick, 
    onDownloadTemplate,
    isExporting,
    isImporting,
    isMobileFab = false
}: {
    onExportExcel: () => void;
    onExportPdf: () => void;
    onImportClick: () => void;
    onDownloadTemplate: () => void;
    isExporting: boolean;
    isImporting: boolean;
    isMobileFab?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isExporting || isImporting}
                className={isMobileFab 
                    ? "flex size-[52px] items-center justify-center rounded-full bg-white text-brand-600 shadow-[0_4px_20px_rgb(0,0,0,0.1)] border-2 border-brand-500 transition-transform active:scale-95 disabled:opacity-50"
                    : "flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"}
            >
                {isMobileFab ? <PlusIcon className="size-6 text-brand-500" /> : <PlusIcon className="size-4" />}
                {!isMobileFab && "Data Actions"}
            </button>
            <Dropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className={`absolute z-30 mt-2 w-48 origin-top-right rounded-xl border border-gray-200 bg-white py-2 shadow-xl ${isMobileFab ? "bottom-full mb-4 right-0" : "right-0"}`}
            >
                <DropdownItem onClick={() => { setIsOpen(false); /* Export disabled */ }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 opacity-50 cursor-not-allowed">
                    Export to Excel (N/A)
                </DropdownItem>
                <DropdownItem onClick={() => { setIsOpen(false); /* Import disabled */ }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 opacity-50 cursor-not-allowed">
                    Import Data (N/A)
                </DropdownItem>
            </Dropdown>
        </div>
    );
};

const Events: React.FC = () => {
  const isMobile = useIsMobile();
  const currentViewMode = isMobile ? "list" : viewMode;
  const navigate = useNavigate();
  const { confirm, confirmState } = useConfirm();

  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all"); 
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  const { data: response, isLoading, refetch } = useEvents({
    page,
    limit: viewMode === "calendar" ? 1000 : limit,
    search: debouncedSearchQuery || undefined,
    eventType: eventTypeFilter || undefined,
    startFrom: startFrom || undefined,
    startTo: startTo || undefined,
    upcoming: timeRangeFilter === "upcoming",
    past: timeRangeFilter === "past",
  });

  const infiniteQuery = useEventsInfinite({
    search: debouncedSearchQuery || undefined,
    eventType: eventTypeFilter || undefined,
    startFrom: startFrom || undefined,
    startTo: startTo || undefined,
    upcoming: timeRangeFilter === "upcoming",
    past: timeRangeFilter === "past",
  });

  const { createMutation, updateMutation, deleteMutation } = useEventMutation();

  const events = response?.data || [];
  const total = Number(response?.meta?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? Math.ceil(total / limit));
  const infiniteEvents = infiniteQuery.data?.pages.flatMap((p: any) => p.data ?? []) ?? [];

  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isDayEventsModalOpen, setIsDayEventsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Event; direction: "asc" | "desc" } | null>(null);

  const [formData, setFormData] = useState<Partial<CreateEventDto & { isCancelled?: boolean, cancellationReason?: string }>>({
    name: "", description: "", location: "", startDateTime: "", endDateTime: "",
    eventType: "", capacity: null, affectsAttendance: false, isCancelled: false, cancellationReason: ""
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobile || viewMode === "calendar") return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
          infiniteQuery.fetchNextPage();
        }
      }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, infiniteQuery, viewMode]);

  useEffect(() => { setSelectedIds(new Set()); }, [page, debouncedSearchQuery, eventTypeFilter, timeRangeFilter, startFrom, startTo]);

  const eventTypes = [
    { label: "Semua Jenis", value: "" },
    { label: "Pertemuan", value: "meeting" },
    { label: "Pelatihan", value: "training" },
    { label: "Upacara", value: "ceremony" },
    { label: "Workshop", value: "workshop" },
  ];

  const timeRangeOptions = [
    { label: "Semua Acara", value: "all" },
    { label: "Akan Datang", value: "upcoming" },
    { label: "Telah Berlalu", value: "past" },
  ];

  const displayEvents = isMobile ? infiniteEvents : events;
  const sortedEvents = React.useMemo(() => {
    if (!sortConfig) return displayEvents;
    return [...displayEvents].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = a[key] ?? "";
      const valB = b[key] ?? "";
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [displayEvents, sortConfig]);

  const allSelected = sortedEvents.length > 0 && sortedEvents.every((e: Event) => selectedIds.has(e.public_id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedEvents.map((e: Event) => e.public_id)));
  };
  const toggleOne = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSort = (key: keyof Event) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };
  const SortIcon = ({ column }: { column: keyof Event }) => {
    if (sortConfig?.key !== column) return <ChevronUpIcon className="size-3 opacity-20" />;
    return sortConfig.direction === "asc" ? <ChevronUpIcon className="size-3 text-brand-500" /> : <ChevronDownIcon className="size-3 text-brand-500" />;
  };

  const handleOpenModal = (event?: Event, start?: string, end?: string) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({
        name: event.name, description: event.description, location: event.location,
        startDateTime: event.startTime, endDateTime: event.endTime, eventType: event.eventType,
        capacity: event.capacity, affectsAttendance: event.affectsAttendance,
        isCancelled: event.isCancelled, cancellationReason: event.cancellationReason
      });
    } else {
      setSelectedEvent(null);
      setFormData({
        name: "", description: "", location: "", startDateTime: start || "", endDateTime: end || "",
        eventType: "", capacity: null, affectsAttendance: false, isCancelled: false, cancellationReason: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = !!selectedEvent;
    const confirmed = await confirm({
      title: isUpdate ? "Edit Acara" : "Buat Acara",
      message: `Apakah Anda yakin ingin ${isUpdate ? "memperbarui" : "membuat"} acara ini?`,
      confirmText: isUpdate ? "Ya, Perbarui" : "Ya, Buat",
      cancelText: "Batal",
      variant: isUpdate ? "update" : "create"
    });
    if (!confirmed) return;

    try {
      if (selectedEvent) {
        await updateMutation.mutateAsync({ id: selectedEvent.public_id, data: formData as UpdateEventDto });
        showSuccess("Acara berhasil diperbarui");
      } else {
        await createMutation.mutateAsync(formData as CreateEventDto);
        showSuccess("Acara berhasil dibuat");
      }
      setIsModalOpen(false);
      refetch();
      infiniteQuery.refetch();
    } catch (err) {
      showError(err, `Gagal ${isUpdate ? "memperbarui" : "membuat"} acara`);
    }
  };

  const handleDelete = async (id: string | number) => {
    const ev = displayEvents.find(e => e.public_id === id);
    if (!ev) return;
    const confirmed = await confirm({
      title: "Hapus Acara",
      message: `Apakah Anda yakin ingin menghapus "${ev.name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "danger"
    });
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(String(id));
      showSuccess("Acara berhasil dihapus");
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      refetch();
      infiniteQuery.refetch();
    } catch (err) {
      showError(err, "Gagal menghapus acara");
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const confirmed = await confirm({
      title: 'Hapus Banyak Acara',
      message: `Apakah Anda yakin ingin menghapus permanen ${count} acara yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: `Hapus ${count} Acara`,
      cancelText: 'Batal',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(String(id))));
      showSuccess(`Berhasil menghapus ${count} acara.`);
      setSelectedIds(new Set());
      refetch();
      infiniteQuery.refetch();
    } catch (error) {
      showError(error, "Gagal menghapus beberapa acara");
    }
  };

  const calendarEvents = React.useMemo(() => {
    return events.map((event): EventInput => ({
      id: event.public_id,
      title: event.name,
      start: event.startTime,
      end: event.endTime,
      extendedProps: {
        event: event,
        calendar: event.eventType === "meeting" ? "primary" : 
                 event.eventType === "training" ? "warning" : 
                 event.eventType === "ceremony" ? "success" : "info"
      }
    }));
  }, [events]);

  return (
    <>
      <PageMeta title="Manajemen Acara" description="Kelola acara perusahaan, pertemuan, dan pelatihan." />
      
      <div className="hidden sm:block">
        <PageBreadcrumb pageTitle="Acara" />
      </div>

      <div className="space-y-3 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Acara</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Jadwalkan dan kelola pertemuan, pelatihan, dan upacara.</p>
          </div>
          <div className="flex items-center gap-3">
             

             {!isMobile && (
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                >
                  <PlusIcon className="fill-white size-5 text-white" />
                  Tambah Acara
                </button>
             )}
          </div>
        </div>

        {/* Animated Tabs */}
        <div className="hidden sm:block sticky top-0 z-40 bg-[#f8fafc] dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10 -mx-4 px-4 sm:mx-0 sm:px-0 pt-2 mb-2">
            <div className="flex items-center gap-8 overflow-x-auto no-scrollbar relative">
                <button
                    onClick={() => { setViewMode("list"); setPage(1); }}
                    className={`relative whitespace-nowrap pb-3 text-sm font-bold transition-colors flex items-center gap-1.5 ${
                        viewMode === "list"
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                >
                    <ListIcon className="size-4" />
                    Daftar
                    {viewMode === "list" && (
                        <motion.div
                            layoutId="eventsActiveTabUnderline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                        />
                    )}
                </button>
                <button
                    onClick={() => setViewMode("calendar")}
                    className={`relative whitespace-nowrap pb-3 text-sm font-bold transition-colors flex items-center gap-1.5 ${
                        viewMode === "calendar"
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                >
                    <TableIcon className="size-4" />
                    Kalender
                    {viewMode === "calendar" && (
                        <motion.div
                            layoutId="eventsActiveTabUnderline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                        />
                    )}
                </button>
            </div>
        </div>

        {viewMode === "list" && (
            <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden">
                <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)} 
                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                    <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                            <FilterIcon className="size-5 text-brand-500" />
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                Cari & Filter Acara
                            </h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Gunakan kriteria di bawah ini untuk menyaring acara berdasarkan jenis atau rentang waktu.
                        </p>
                    </div>
                    <div className="shrink-0 ml-4">
                        <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
                    </div>
                </button>
                
                <div 
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                        isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                >
                    <div className="overflow-hidden min-h-0">
                        <div className="px-5 pb-5">
                            <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                            
                            <div className="grid grid-cols-1 gap-5 items-end sm:grid-cols-2 lg:grid-cols-12">
                                <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
                                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Jenis Acara</Label>
                                    <CustomSelect
                                        value={eventTypeFilter}
                                        onChange={(val) => { setEventTypeFilter(String(val)); setPage(1); }}
                                        options={eventTypes}
                                        className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
                                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Rentang Waktu</Label>
                                    <CustomSelect
                                        value={timeRangeFilter}
                                        onChange={(val) => { setTimeRangeFilter(String(val)); setPage(1); }}
                                        options={timeRangeOptions}
                                        className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1.5 sm:col-span-1 lg:col-span-4">
                                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pencarian</Label>
                                    <div className="relative">
                                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Cari nama acara..."
                                            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-2">
                                    <button
                                        onClick={() => {
                                            setSearchQuery("");
                                            setEventTypeFilter("");
                                            setTimeRangeFilter("all");
                                            setPage(1);
                                        }}
                                        className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {currentViewMode === "list" && (
            <TableToolbar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              bulkActions={[
                {
                  label: "Hapus Terpilih",
                  icon: <TrashBinIcon className="size-3.5" />,
                  onClick: handleBulkDelete,
                  variant: "danger",
                },
              ]}
            />
        )}


        {currentViewMode === "list" ? (
          isMobile ? (
            <div className="space-y-3">
                {infiniteEvents.length > 0 && (
                <div className="flex items-center gap-3 px-1">
                    <Checkbox checked={allSelected} onChange={toggleAll} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedIds.size > 0 ? `${selectedIds.size} acara dipilih` : "Pilih semua"}
                    </span>
                </div>
                )}

                {infiniteQuery.isLoading ? (
                    <div className="grid grid-cols-1 gap-3">
                        {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.06] dark:bg-white/[0.02] animate-pulse space-y-3">
                            <div className="flex justify-between">
                            <div className="h-4 w-24 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                            <div className="h-4 w-16 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                            </div>
                            <div className="h-4 w-3/4 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                            <div className="h-3 w-1/2 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                        </div>
                        ))}
                    </div>
                ) : infiniteEvents.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                        <CalenderIcon className="size-7 opacity-30" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tidak ada acara ditemukan.</p>
                        <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400"
                        >
                        <PlusIcon className="size-3 fill-current" /> Tambah Acara
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {sortedEvents.map((event: Event) => (
                        <EventCard
                            key={event.public_id}
                            event={event}
                            isSelected={selectedIds.has(event.public_id)}
                            onToggle={() => toggleOne(event.public_id)}
                            onEdit={() => handleOpenModal(event)}
                            onDelete={() => handleDelete(event.public_id)}
                            onManageInvites={() => { setSelectedEvent(event); setIsManageModalOpen(true); }}
                        />
                        ))}
                    </div>
                )}
                
                <div ref={sentinelRef} className="py-2 flex items-center justify-center">
                    {infiniteQuery.isFetchingNextPage && <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />}
                    {!infiniteQuery.hasNextPage && infiniteEvents.length > 0 && <p className="text-xs text-gray-400">Semua acara dimuat</p>}
                </div>

                <div className="fixed bottom-24 right-4 z-40">
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex size-[52px] items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_4px_20px_rgba(26,86,219,0.3)] transition-transform active:scale-95 hover:bg-brand-600"
                    >
                        <PlusIcon className="size-6 fill-white text-white" />
                    </button>
                </div>
            </div>
          ) : (
            <>
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <Table>
                        <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                            <TableRow>
                                <TableCell isHeader className="w-10 px-4 py-3.5">
                                    <Checkbox checked={allSelected} onChange={toggleAll} />
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5">
                                    <button onClick={() => handleSort("name")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                                        Detail Acara <SortIcon column="name" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5">
                                    <button onClick={() => handleSort("startTime")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                                        Waktu Pelaksanaan <SortIcon column="startTime" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5">
                                    <button onClick={() => handleSort("capacity")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                                        Kapasitas <SortIcon column="capacity" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-center">
                                    <button onClick={() => handleSort("isCancelled")} className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                                        Status <SortIcon column="isCancelled" />
                                    </button>
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-right font-medium text-gray-500 uppercase tracking-wider text-xs">
                                    Aksi
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {isLoading ? (
                                <SkeletonTable rows={5} columns={6} />
                            ) : sortedEvents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                            <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                                                <CalenderIcon className="size-7 opacity-30" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tidak ada acara ditemukan.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedEvents.map((event: Event) => (
                                    <TableRow key={event.public_id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <TableCell className="px-4 py-3.5">
                                            <Checkbox checked={selectedIds.has(event.public_id)} onChange={() => toggleOne(event.public_id)} />
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 rounded-lg p-2 ${
                                                    event.eventType === 'meeting' ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10' :
                                                    event.eventType === 'training' ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' :
                                                    event.eventType === 'ceremony' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' :
                                                    'bg-brand-50 text-brand-500 dark:bg-brand-500/10'
                                                }`}>
                                                    {event.eventType === 'meeting' ? <UserIcon className="size-5" /> :
                                                    event.eventType === 'training' ? <TimeIcon className="size-5" /> :
                                                    event.eventType === 'ceremony' ? <GroupIcon className="size-5" /> :
                                                    <CalenderIcon className="size-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{event.name}</p>
                                                    <p className="text-xs text-gray-500 line-clamp-1">{event.description || "Tidak ada deskripsi"}</p>
                                                    <div className="mt-1 flex items-center gap-3 text-[10px] sm:text-xs text-gray-400">
                                                        {event.location && <span>{event.location}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            <div className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
                                                <span>{new Date(event.startTime).toLocaleString('id-ID')}</span>
                                                <span className="text-xs text-gray-400">Sampai: {new Date(event.endTime).toLocaleString('id-ID')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300">
                                            {event.capacity !== null ? (
                                                <div className="flex flex-col gap-1 w-32">
                                                    <div className="flex items-center justify-between text-[11px] font-semibold">
                                                        <span className="text-brand-600 dark:text-brand-400">{(event as any)._count?.invitations || (event as any).invitationsCount || 0} Terisi</span>
                                                        <span className="text-gray-500">/ {event.capacity}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full bg-brand-500 transition-all"
                                                            style={{ width: `${Math.min((((event as any)._count?.invitations || (event as any).invitationsCount || 0) / event.capacity) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 border border-gray-100 dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-gray-300">
                                                    Tak Terbatas
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 text-center">
                                            {event.isCancelled ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <Badge color="error">Dibatalkan</Badge>
                                                    {event.cancellationReason && (
                                                        <p className="text-[10px] text-error-500 italic max-w-[150px] line-clamp-1" title={event.cancellationReason}>
                                                            "{event.cancellationReason}"
                                                        </p>
                                                    )}
                                                </div>
                                            ) : new Date(event.startTime) > new Date() ? (
                                                <Badge color="info">Akan Datang</Badge>
                                            ) : new Date(event.endTime) < new Date() ? (
                                                <Badge color="warning">Berakhir</Badge>
                                            ) : (
                                                <Badge color="success">Berlangsung</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!event.isCancelled && (
                                                    <button 
                                                        onClick={() => { setSelectedEvent(event); setIsManageModalOpen(true); }}
                                                        disabled={event.isCancelled || new Date(event.endTime) < new Date()}
                                                        className="px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 disabled:opacity-50 transition-colors"
                                                    >
                                                        Kelola Undangan
                                                    </button>
                                                )}
                                                <TableActionMenu>
                                                    <DropdownItem
                                                        onClick={() => handleOpenModal(event)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                                                    >
                                                        <PencilIcon className="size-3.5" /> Edit Acara
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        onClick={() => handleDelete(event.public_id)}
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                                                    >
                                                        <TrashBinIcon className="size-3.5" /> Hapus
                                                    </DropdownItem>
                                                </TableActionMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 px-2 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
                        <p className="text-sm text-gray-500">
                            Menampilkan <span className="font-semibold">{Math.min((page - 1) * limit + 1, total)}</span> ke <span className="font-semibold">{Math.min(page * limit, total)}</span> dari <span className="font-semibold">{total}</span> data
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                            >
                                <ChevronLeftIcon className="size-4" /> Sebelumnya
                            </button>
                            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">{page} / {totalPages}</span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                            >
                                Selanjutnya <AngleRightIcon className="size-4" />
                            </button>
                        </div>
                    </div>
                )}
            </>
          )
        ) : (
          <div className="h-[800px] rounded-2xl bg-white p-4 border border-gray-200 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <CalendarWidget
              events={calendarEvents}
              onEventClick={(info) => {
                const ev = info.event.extendedProps.event as Event;
                if (ev) handleOpenModal(ev);
              }}
              onDateClick={(info) => { setSelectedDate(info.dateStr); setIsDayEventsModalOpen(true); }}
            />
          </div>
        )}

      </div>

      {/* Modal - Create/Edit Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEvent ? "Edit Acara" : "Buat Acara Baru"}
        description={selectedEvent ? "Modifikasi detail dan pengaturan acara." : "Jadwalkan acara baru untuk organisasi."}
        className="max-w-md"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]">
              Batal
            </button>
            <button
              type="submit"
              form="event-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-600 disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {selectedEvent ? "Simpan Perubahan" : "Buat Acara"}
            </button>
          </div>
        }
      >
          <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Acara <span className="text-red-500">*</span></Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nama Acara" required />
              </div>
              <div className="space-y-1.5">
                <Label>Deskripsi Acara (Opsional)</Label>
                <textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                    rows={3}
                    placeholder="Masukkan deskripsi acara"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Waktu Mulai <span className="text-red-500">*</span></Label>
                    <DatePicker type="datetime" value={formData.startDateTime ? new Date(formData.startDateTime).toISOString().slice(0, 16).replace('T', ' ') : ""} onChange={(val) => { if(val) setFormData({...formData, startDateTime: new Date(val).toISOString()}) }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Waktu Selesai <span className="text-red-500">*</span></Label>
                    <DatePicker type="datetime" value={formData.endDateTime ? new Date(formData.endDateTime).toISOString().slice(0, 16).replace('T', ' ') : ""} onChange={(val) => { if(val) setFormData({...formData, endDateTime: new Date(val).toISOString()}) }} />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <Label>Jenis Acara</Label>
                      <CustomSelect
                         value={formData.eventType || ""}
                         onChange={(val) => setFormData({...formData, eventType: String(val)})}
                         options={eventTypes.filter(t => t.value !== "")}
                      />
                  </div>
                  <div className="space-y-1.5">
                      <Label>Kapasitas (Opsional)</Label>
                      <NumberInput
                         value={formData.capacity || undefined}
                         onChange={(val) => setFormData({...formData, capacity: val})}
                         min={1}
                         placeholder="Tak Terbatas"
                      />
                  </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-white shadow-sm border border-gray-200 dark:border-white/[0.08] dark:bg-white/[0.05]">
                        <GroupIcon className="size-5 text-gray-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Kehadiran?</p>
                        <p className="text-xs text-gray-500">Mempengaruhi persentase kehadiran.</p>
                    </div>
                </div>
                <Switch
                    checked={formData.affectsAttendance || false}
                    onChange={(val) => setFormData({...formData, affectsAttendance: val})}
                />
              </div>

              {selectedEvent && (
                  <div className="border border-red-200 bg-red-50 p-4 rounded-xl space-y-4">
                     <div className="flex items-center gap-2">
                         <Checkbox checked={formData.isCancelled} onChange={() => setFormData({...formData, isCancelled: !formData.isCancelled})} />
                         <Label className="text-red-600 font-bold">Batalkan Acara</Label>
                     </div>
                     {formData.isCancelled && (
                         <div className="space-y-1.5 mt-2">
                             <Input 
                                placeholder="Alasan Pembatalan"
                                value={formData.cancellationReason || ""}
                                onChange={(e) => setFormData({...formData, cancellationReason: e.target.value})}
                             />
                         </div>
                     )}
                  </div>
              )}
          </form>
      </Modal>

      {/* Invitations Modal */}
      {selectedEvent && (
          <ManageInvitationsModal 
             isOpen={isManageModalOpen}
             onClose={() => setIsManageModalOpen(false)}
             event={selectedEvent}
          />
      )}

      {/* Day Events Modal */}
      {selectedDate && (
          <DayEventsModal
             isOpen={isDayEventsModalOpen}
             onClose={() => setIsDayEventsModalOpen(false)}
             date={selectedDate}
             events={events.filter(e => e.startTime.startsWith(selectedDate))}
             onAddEvent={(date) => {
                 setFormData({...formData, startDateTime: `${date}T09:00:00Z`, endDateTime: `${date}T10:00:00Z`});
                 setSelectedEvent(null);
                 setIsModalOpen(true);
             }}
             onEditEvent={(e) => handleOpenModal(e)}
          />
      )}
      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Events;
