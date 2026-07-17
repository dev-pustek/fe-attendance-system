import React, { useState, useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../../../../api/services/attendanceService";
import { format, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { API_BASE_URL } from "../../../../api/client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../../components/atoms/Table";
import TableToolbar from "../../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../../components/molecules/SkeletonRow";
import CustomSelect from "../../../../components/molecules/CustomSelect";
import DatePicker from "../../../../components/molecules/DatePicker";
import Checkbox from "../../../../components/atoms/Checkbox";
import Badge from "../../../../components/atoms/Badge";
import Avatar from "../../../../components/atoms/Avatar";
import DropdownItem from "../../../../components/atoms/DropdownItem";
import Label from "../../../../components/atoms/Label";

import { useDebounce } from "../../../../hooks/useDebounce";
import { useConfirm } from "../../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../../utils/toast";
import ConfirmDialog from "../../../../components/molecules/ConfirmDialog";
import Modal from "../../../../components/molecules/Modal";

import {
  TrashBinIcon,
  EyeIcon,
  CalenderIcon,
  CheckCircleIcon,
  TimeIcon,
  CloseIcon,
  VideoIcon,
  UserIcon,
  FilterIcon,
  ChevronDownIcon,
  SearchIcon,
} from "../../../../components/atoms/Icons";

import GateCard from "../Cards/GateCard";
import TableActionMenu from "../../../../components/molecules/TableActionMenu";
import MetricCard from "../../../../components/molecules/MetricCard";



function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

const getStatusBadge = (status: string, isLate?: boolean) => {
  if (isLate) return <Badge color="error">Late</Badge>;
  if (status === 'present' || status === 'on-time') return <Badge color="success">Present</Badge>;
  if (status === 'absent') return <Badge color="error">Absent</Badge>;
  if (status === 'excused') return <Badge color="warning">Excused</Badge>;
  return <Badge color="primary">{status}</Badge>;
};

const RowActionMenu = ({ onDelete, onViewDetails }: { onDelete: () => void, onViewDetails: () => void }) => {
  return (
    <TableActionMenu>
        <DropdownItem onClick={onViewDetails} className="text-gray-700 dark:text-gray-300">
          <EyeIcon className="size-3.5" /> Lihat Detail
        </DropdownItem>
        <DropdownItem onClick={onDelete} className="text-error-600 dark:text-error-400 focus:bg-error-50 dark:focus:bg-error-500/10">
          <TrashBinIcon className="size-3.5" /> Hapus
        </DropdownItem>
    </TableActionMenu>
  );
};

export default function GateTab() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { confirm, confirmState } = useConfirm();

  // ── Pagination & Filters ──
  const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth >= 640);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<any | null>(null);

  // Clear selection on filter change
  useEffect(() => { setSelectedIds(new Set()); setSelectedDetailRecord(null); }, [page, searchQuery, statusFilter, dateFrom, dateTo]);

  // ── Queries ──
  // Infinite query for both Desktop and Mobile
  const { 
    data: gateData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading 
  } = useInfiniteQuery({
    queryKey: ["gateHistory", limit, statusFilter, dateFrom, dateTo, searchQuery],
    queryFn: ({ pageParam = 1 }) =>
      attendanceService.getAttendanceHistory({
        page: pageParam,
        limit,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      }),
    getNextPageParam: (lastPage) => {
       const current = Number(lastPage.meta?.page || 1);
       const last = lastPage.meta?.totalPages ?? lastPage.meta?.lastPage ?? 1;
       return current < last ? current + 1 : undefined; 
    },
    initialPageParam: 1,
  });

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteAttendanceRecord(id),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["gateHistory"] });
        queryClient.invalidateQueries({ queryKey: ["gateHistoryMobile"] });
        queryClient.invalidateQueries({ queryKey: ['mobile-student-roadmap'] });
    }
  });

  // ── Helpers ──
  const displayItems = gateData?.pages.flatMap(p => p.data) || [];
  const allSelected = displayItems.length > 0 && displayItems.every((item) => selectedIds.has(item.id || item.public_id));
  const meta = gateData?.pages[0]?.meta;
  const metrics = gateData?.pages[0]?.metrics;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayItems.map((item) => item.id || item.public_id).filter(Boolean)));
  };

  const toggleOne = (id: number | string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Rekaman",
      message: "Apakah Anda yakin ingin menghapus rekaman kehadiran ini?",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      showSuccess("Rekaman berhasil dihapus");
    } catch (err) {
      showError(err, "Gagal menghapus rekaman");
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Terpilih",
      message: `Hapus ${selectedIds.size} rekaman? Tindakan ini tidak dapat dibatalkan.`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)));
      setSelectedIds(new Set());
      showSuccess("Rekaman terpilih berhasil dihapus.");
    } catch (err) {
      showError(err, "Gagal menghapus beberapa rekaman");
    }
  };

  // ── Intersection Observer ──
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { threshold: 0.1, rootMargin: '100px' });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-5">
      {/* Metrics */}
      {!isLoading && meta && metrics && (
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-6 md:gap-4 md:pb-0 md:mx-0 md:px-0 no-scrollbar">
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Total Hari" value={metrics.totalDays} icon={<CalenderIcon />} color="blue" />
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Hadir" value={metrics.presentCount} icon={<CheckCircleIcon />} color="green" />
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Terlambat" value={metrics.lateCount} icon={<TimeIcon />} color="orange" />
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Pulang Cepat" value={metrics.earlyLeaveCount} icon={<TimeIcon />} color="yellow" />
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Tidak Hadir" value={metrics.absentCount} icon={<CloseIcon />} color="red" />
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Persentase Hadir" value={`${metrics.attendancePercentage}%`} icon={<CheckCircleIcon />} color="brand" badge={{ text: metrics.attendancePercentage >= 90 ? "Bagus" : "Kurang", color: metrics.attendancePercentage >= 90 ? "success" : "warning" }} />
        </div>
      )}

      {/* ── Advanced Filter Card ── */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden">
          <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
              <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                      <FilterIcon className="size-5 text-brand-500" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          Cari & Filter Kehadiran
                      </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                      Gunakan kriteria di bawah ini untuk memfilter rekaman gerbang berdasarkan tanggal atau status.
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
                          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Rentang Tanggal</Label>
                              <div className="flex gap-2">
                                <DatePicker 
                                    value={dateFrom} 
                                    onChange={(d) => { setDateFrom(d); setPage(1); }}
                                    placeholder="Tanggal Mulai"
                                />
                                <DatePicker 
                                    value={dateTo} 
                                    onChange={(d) => { setDateTo(d); setPage(1); }}
                                    placeholder="Tanggal Akhir"
                                />
                              </div>
                          </div>
                          <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                              <CustomSelect
                                  value={statusFilter}
                                  onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
                                  options={[
                                      { label: "Semua Status", value: "" },
                                      { label: "Hadir", value: "present" },
                                      { label: "Terlambat", value: "late" },
                                      { label: "Tidak Hadir", value: "absent" },
                                  ]}
                                  className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                              />
                          </div>
                          <div className="space-y-1.5 sm:col-span-1 lg:col-span-4">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cari</Label>
                              <div className="relative">
                                  <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                  <input
                                      type="text"
                                      value={searchInput}
                                      onChange={(e) => setSearchInput(e.target.value)}
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                              setSearchQuery(searchInput);
                                              setPage(1);
                                          }
                                      }}
                                      placeholder="Cari nama, NIS..."
                                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                  />
                              </div>
                          </div>
                          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                              <button
                                  onClick={() => {
                                      setSearchInput("");
                                      setSearchQuery("");
                                      setStatusFilter("");
                                      setDateFrom(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
                                      setDateTo(format(endOfWeek(new Date()), 'yyyy-MM-dd'));
                                      setPage(1);
                                  }}
                                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                              >
                                  Reset
                              </button>
                              <button
                                  onClick={() => {
                                      setSearchQuery(searchInput);
                                      setPage(1);
                                  }}
                                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-600"
                              >
                                  <SearchIcon className="size-4" />
                                  Cari
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Toolbar for Bulk Actions */}
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

      {/* Content */}
      {isMobile ? (
        <div className="space-y-3">
          {displayItems.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <Checkbox checked={allSelected} onChange={toggleAll} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedIds.size > 0 ? `${selectedIds.size} terpilih` : "Pilih semua"}
              </span>
            </div>
          )}

          {isLoading ? (
             <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                   <div key={i} className="h-32 bg-white dark:bg-white/5 animate-pulse rounded-2xl border border-gray-100 dark:border-white/5" />
                ))}
             </div>
          ) : displayItems.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Tidak ada rekaman gerbang ditemukan.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayItems.map((item) => (
                <div key={item.id || item.public_id} onClick={() => setSelectedDetailRecord(item)} className="cursor-pointer">
                  <GateCard 
                    record={item}
                    isSelected={selectedIds.has(item.id || item.public_id)}
                    onToggle={() => toggleOne(item.id || item.public_id)}
                    onDelete={() => handleDelete(item.id || item.public_id)}
                    onViewDetails={() => setSelectedDetailRecord(item)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-2 flex items-center justify-center">
            {isFetchingNextPage && <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />}
            {!hasNextPage && displayItems.length > 0 && <p className="text-xs text-gray-400">All records loaded</p>}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] overflow-x-auto [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
          <Table>
            <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
              <TableRow>
                <TableCell isHeader className="w-10 px-4 py-3.5">
                  <Checkbox checked={allSelected} onChange={toggleAll} />
                </TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pengguna</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Masuk</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Keluar</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Metode</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTable columns={8} rows={5} />
              ) : displayItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-gray-500 text-sm">
                    Tidak ada rekaman kehadiran gerbang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                displayItems.map((record) => {
                  const isSelected = selectedIds.has(record.id || record.public_id);
                  const isStudent = record.user?.role === 'student' || record.studentProfile;
                  const identifier = isStudent 
                    ? (record.studentProfile?.nis || record.user?.profile?.nis || '-') 
                    : (record.user?.email || record.userId);

                  return (
                    <TableRow key={record.id || record.public_id} className={`group transition-colors ${
                      isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                    }`}>
                      <TableCell className="w-10 px-4 py-4">
                        <Checkbox checked={isSelected} onChange={() => toggleOne(record.id || record.public_id)} />
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={record.user?.photo || record.user?.profile?.photo} alt={record.user?.name} size="small" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{record.user?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{identifier}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.date ? format(parseISO(record.date), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center text-sm font-medium text-gray-900 dark:text-white">
                        {record.clockIn ? format(parseISO(record.clockIn), 'HH:mm') : '--:--'}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center text-sm font-medium text-gray-900 dark:text-white">
                        {record.clockOut ? format(parseISO(record.clockOut), 'HH:mm') : '--:--'}
                        {record.isEarlyLeave && <span className="text-[10px] text-warning-600 ml-1 block mt-0.5">-{record.earlyLeaveMinutes}m</span>}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <Badge color="light" size="small" className="uppercase tracking-wider font-semibold text-[10px]">
                           {record.method?.replace('_', ' ') || 'MANUAL'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                         {getStatusBadge(record.statusLabel || record.status?.name || 'present', record.isLate)}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <RowActionMenu 
                          onViewDetails={() => setSelectedDetailRecord(record)}
                          onDelete={() => handleDelete(record.id || record.public_id)} 
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {/* Infinite scroll sentinel for desktop */}
          <div ref={sentinelRef} className="py-4 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-center bg-white dark:bg-gray-900 rounded-b-2xl">
            {isFetchingNextPage && <div className="flex items-center gap-3"><div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /><span className="text-sm text-gray-500">Memuat data tambahan...</span></div>}
            {!hasNextPage && displayItems.length > 0 && <p className="text-xs text-gray-400">Semua data telah ditampilkan</p>}
          </div>
        </div>
      )}

      <Modal 
        isOpen={!!selectedDetailRecord} 
        onClose={() => setSelectedDetailRecord(null)} 
        className="max-w-xl sm:m-4"
        title={
          <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <UserIcon className="size-5" />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Detail Kehadiran</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{selectedDetailRecord?.date ? format(parseISO(selectedDetailRecord.date), "EEEE, dd MMMM yyyy") : "-"}</p>
              </div>
          </div>
        }
        footer={
          <div className="flex justify-end gap-3 w-full border-t border-gray-100 p-4 dark:border-white/[0.05]">
            <button 
              onClick={() => setSelectedDetailRecord(null)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.02]"
            >
              Tutup
            </button>
          </div>
        }
      >
        {selectedDetailRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 p-5 rounded-2xl bg-success-50/30 border border-success-100 dark:bg-success-500/5 dark:border-success-500/10 transition-all hover:bg-success-50/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-success-700 dark:text-success-400 uppercase tracking-widest">Clock In</span>
                        <TimeIcon className="size-4 text-success-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {selectedDetailRecord.clockIn ? format(parseISO(selectedDetailRecord.clockIn), "HH:mm:ss") : "--:--:--"}
                    </p>
                    <p className="text-[10px] text-success-600 font-medium uppercase truncate">Source: {selectedDetailRecord.method || 'MANUAL'}</p>
                </div>
                <div className="space-y-3 p-5 rounded-2xl bg-error-50/30 border border-error-100 dark:bg-error-500/5 dark:border-error-500/10 transition-all hover:bg-error-50/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-error-700 dark:text-error-400 uppercase tracking-widest">Clock Out</span>
                        <TimeIcon className="size-4 text-error-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {selectedDetailRecord.clockOut ? format(parseISO(selectedDetailRecord.clockOut), "HH:mm:ss") : "--:--:--"}
                    </p>
                    <p className="text-[10px] text-error-600 font-medium uppercase truncate">Processed locally</p>
                    {selectedDetailRecord.isEarlyLeave && <p className="text-xs text-warning-600 mt-1 font-bold">Pulang Awal: {selectedDetailRecord.earlyLeaveMinutes}m</p>}
                </div>
            </div>

            {selectedDetailRecord.notes && (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Officer Notes</label>
                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 text-sm text-gray-600 dark:border-white/[0.05] dark:bg-white/[0.01] dark:text-gray-400 italic font-medium leading-relaxed">
                        "{selectedDetailRecord.notes}"
                    </div>
                </div>
            )}
            
            {(selectedDetailRecord.photoUrl || selectedDetailRecord.photoEvidenceUrl || selectedDetailRecord.photoEvidence) && (
                <div className="space-y-2 mt-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                        <VideoIcon className="size-3.5" /> 
                        Photo Evidence
                    </label>
                    <div className="aspect-[3/4] max-w-[320px] mx-auto rounded-2xl border border-gray-100 bg-gray-50/50 p-2 dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden shadow-md">
                        <img 
                            src={
                                (selectedDetailRecord.photoUrl || selectedDetailRecord.photoEvidenceUrl || selectedDetailRecord.photoEvidence)?.startsWith('/') 
                                    ? `${new URL(API_BASE_URL).origin}${(selectedDetailRecord.photoUrl || selectedDetailRecord.photoEvidenceUrl || selectedDetailRecord.photoEvidence)}`
                                    : (selectedDetailRecord.photoUrl || selectedDetailRecord.photoEvidenceUrl || selectedDetailRecord.photoEvidence)
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

      {/* Confirm Dialog */}
      <ConfirmDialog {...confirmState} />
    </div>
  );
}
