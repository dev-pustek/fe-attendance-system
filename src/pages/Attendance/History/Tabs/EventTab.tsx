import React, { useState, useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../../../../api/services/attendanceService";
import { format, parseISO } from "date-fns";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../../components/atoms/Table";
import TableToolbar from "../../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../../components/molecules/SkeletonRow";
import CustomSelect from "../../../../components/molecules/CustomSelect";
import Checkbox from "../../../../components/atoms/Checkbox";
import Badge from "../../../../components/atoms/Badge";
import DropdownItem from "../../../../components/atoms/DropdownItem";
import Label from "../../../../components/atoms/Label";

import { useConfirm } from "../../../../hooks/useConfirm";

import {
  EyeIcon,
  CalenderIcon,
  CheckCircleIcon,
  CloseIcon,
  FilterIcon,
  ChevronDownIcon,
} from "../../../../components/atoms/Icons";

import EventCard from "../Cards/EventCard";
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

const RowActionMenu = ({ onViewDetails }: { onViewDetails: () => void }) => {
  return (
    <TableActionMenu>
        <DropdownItem onClick={onViewDetails} className="text-gray-700 dark:text-gray-300">
          <EyeIcon className="size-3.5" /> Lihat Detail
        </DropdownItem>
    </TableActionMenu>
  );
};

export default function EventTab() {
  const isMobile = useIsMobile();

  // ── Pagination & Filters ──
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [eventStatus, setEventStatus] = useState("");
  const [eventTimeFilter, setEventTimeFilter] = useState<"all" | "upcoming" | "past">("all");
  
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Clear selection on filter change
  useEffect(() => { setSelectedIds(new Set()); }, [page, eventStatus, eventTimeFilter]);

  // ── Queries ──
  // Desktop Pagination
  const { data: eventResponse, isLoading: isLoadingDesktop } = useQuery({
    queryKey: ["eventHistory", page, limit, eventStatus, eventTimeFilter],
    queryFn: () =>
      attendanceService.getMyEvents({
        page,
        limit,
        status: eventStatus || undefined,
        upcoming: eventTimeFilter === 'upcoming',
        past: eventTimeFilter === 'past',
      }),
    enabled: !isMobile,
  });

  // Mobile Infinite
  const { 
    data: eventMobileData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading: isLoadingMobile 
  } = useInfiniteQuery({
    queryKey: ["eventHistoryMobile", limit, eventStatus, eventTimeFilter],
    queryFn: ({ pageParam = 1 }) =>
      attendanceService.getMyEvents({
        page: pageParam,
        limit,
        status: eventStatus || undefined,
        upcoming: eventTimeFilter === 'upcoming',
        past: eventTimeFilter === 'past',
      }),
    getNextPageParam: (lastPage) => {
       const current = Number(lastPage.meta?.page || 1);
       const last = lastPage.meta?.totalPages ?? lastPage.meta?.lastPage ?? 1;
       return current < last ? current + 1 : undefined; 
    },
    initialPageParam: 1,
    enabled: isMobile,
  });


  // ── Helpers ──
  const displayItems = isMobile ? (eventMobileData?.pages.flatMap(p => p.data) || []) : (eventResponse?.data || []);
  const allSelected = displayItems.length > 0 && displayItems.every((item) => selectedIds.has(item.id || item.public_id));
  const isLoading = isMobile ? isLoadingMobile : isLoadingDesktop;
  const meta = eventResponse?.meta;

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

  // ── Intersection Observer for Mobile ──
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobile) return;
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
      {!isLoading && meta && eventResponse?.metrics && (
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-4 md:gap-4 md:pb-0 md:mx-0 md:px-0 no-scrollbar">
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Total Acara" value={eventResponse.metrics.totalEvents} icon={<CalenderIcon />} color="blue" />
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Hadir" value={eventResponse.metrics.attendedCount} icon={<CheckCircleIcon />} color="green" />
          <MetricCard className="min-w-[140px] w-[40vw] max-w-[160px] shrink-0 snap-center md:w-auto md:max-w-none md:min-w-0" title="Tidak Hadir" value={eventResponse.metrics.missedCount} icon={<CloseIcon />} color="red" />
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
                          Cari & Filter Acara
                      </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                      Gunakan kriteria di bawah ini untuk memfilter undangan acara berdasarkan status dan waktu.
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
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status Undangan</Label>
                              <CustomSelect
                                  value={eventStatus}
                                  onChange={(val) => { setEventStatus(String(val)); setPage(1); }}
                                  options={[
                                      { label: "Semua Status Undangan", value: "" },
                                      { label: "Menunggu", value: "pending" },
                                      { label: "Diterima", value: "accepted" },
                                      { label: "Ditolak", value: "declined" },
                                  ]}
                                  className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                              />
                          </div>
                          <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Waktu Acara</Label>
                              <CustomSelect
                                  value={eventTimeFilter}
                                  onChange={(val) => { setEventTimeFilter(val as "all" | "upcoming" | "past"); setPage(1); }}
                                  options={[
                                      { label: "Semua Waktu", value: "all" },
                                      { label: "Akan Datang", value: "upcoming" },
                                      { label: "Selesai", value: "past" },
                                  ]}
                                  className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                              />
                          </div>
                          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-6">
                              <button
                                  onClick={() => {
                                      setEventStatus("");
                                      setEventTimeFilter("all");
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

      {/* Toolbar for Bulk Actions */}
      <TableToolbar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        bulkActions={[]}
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
            <div className="py-12 text-center text-gray-400 text-sm">Tidak ada rekaman kehadiran acara ditemukan.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayItems.map((item) => (
                <EventCard 
                  key={item.id || item.public_id} 
                  record={item}
                  isSelected={selectedIds.has(item.id || item.public_id)}
                  onToggle={() => toggleOne(item.id || item.public_id)}
                  onViewDetails={() => { /* View details for Event */ }}
                />
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
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Acara</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lokasi & Jadwal</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Masuk</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Keluar</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status Undangan</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status Kehadiran</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTable columns={8} rows={5} />
              ) : displayItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-gray-500 text-sm">
                    Tidak ada rekaman kehadiran acara ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                displayItems.map((record) => {
                  const isSelected = selectedIds.has(record.id || record.public_id);
                  return (
                    <TableRow key={record.id || record.public_id} className={`group transition-colors ${
                      isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                    }`}>
                      <TableCell className="w-10 px-4 py-4">
                        <Checkbox checked={isSelected} onChange={() => toggleOne(record.id || record.public_id)} />
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex flex-col gap-1 w-full max-w-[200px]">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                               {record.event?.name || '-'}
                            </p>
                            <Badge color="light" size="sm" className="w-fit uppercase tracking-wider font-semibold text-[10px]">
                               {record.event?.eventType || 'event'}
                            </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <p className="font-medium text-gray-900 dark:text-white mb-1">{record.event?.location || 'Tidak ada lokasi'}</p>
                        <p className="text-xs text-gray-500">
                           {record.event?.startTime ? format(parseISO(record.event.startTime), 'dd MMM yy HH:mm') : '-'}
                           {' hingga '}
                           {record.event?.endTime ? format(parseISO(record.event.endTime), 'HH:mm') : '-'}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center text-sm font-medium text-gray-900 dark:text-white">
                        {record.attendanceStatus?.clockIn ? format(parseISO(record.attendanceStatus.clockIn), 'HH:mm') : '--:--'}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center text-sm font-medium text-gray-900 dark:text-white">
                        {record.attendanceStatus?.clockOut ? format(parseISO(record.attendanceStatus.clockOut), 'HH:mm') : '--:--'}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <Badge color="light" size="sm" className="uppercase tracking-wider font-semibold text-[10px]">
                           {record.status || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                         {record.attendanceStatus?.hasAttended
                             ? getStatusBadge(record.attendanceStatus.status, record.attendanceStatus.isLate)
                             : <Badge color="warning">Tidak Hadir</Badge>}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <RowActionMenu 
                          onViewDetails={() => { /* Implement if needed */ }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {/* Desktop Pagination */}
          {!isLoading && meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4 dark:border-white/[0.05] dark:bg-gray-900">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * limit + 1}</span> hingga <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * limit, meta.total)}</span> dari <span className="font-medium text-gray-900 dark:text-white">{meta.total}</span> rekaman
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.02]">
                  Sebelumnya
                </button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.02]">
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
