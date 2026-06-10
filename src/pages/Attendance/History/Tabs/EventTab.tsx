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
import Dropdown from "../../../../components/molecules/Dropdown";
import DropdownItem from "../../../../components/atoms/DropdownItem";

import { useConfirm } from "../../../../hooks/useConfirm";

import {
  MoreDotIcon,
  EyeIcon,
  CalenderIcon,
  CheckCircleIcon,
  CloseIcon,
} from "../../../../components/atoms/Icons";

import EventCard from "../Cards/EventCard";

const MetricCard = ({ label, value, icon }: { label: string, value: number | string, icon: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-3">
    <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5 shrink-0">
      {React.isValidElement(icon)
         ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `size-5 ${((icon as React.ReactElement).props as { className?: string }).className || ''}` })
         : icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

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
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200">
        <MoreDotIcon className="size-5" />
      </button>
      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)}
        className="absolute right-0 top-full z-20 mt-1 w-36 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900">
        <DropdownItem onClick={() => { setIsOpen(false); onViewDetails(); }} className="text-gray-700 dark:text-gray-300">
          <EyeIcon className="size-3.5" /> View Details
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

export default function EventTab() {
  const isMobile = useIsMobile();

  // ── Pagination & Filters ──
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Events" value={eventResponse.metrics.totalEvents} icon={<CalenderIcon className="text-blue-500" />} />
          <MetricCard label="Attended" value={eventResponse.metrics.attendedCount} icon={<CheckCircleIcon className="text-green-500" />} />
          <MetricCard label="Missed" value={eventResponse.metrics.missedCount} icon={<CloseIcon className="text-red-500" />} />
        </div>
      )}

      {/* Filters & Toolbar */}
      <TableToolbar
        searchValue={""}
        onSearchChange={() => {}}
        searchPlaceholder="Search events unavailable"
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        filters={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <CustomSelect 
                value={eventStatus} 
                onChange={(val) => { setEventStatus(String(val)); setPage(1); }} 
                options={[{label: "All Invitation Status", value: ""}, {label: "Pending", value: "pending"}, {label: "Accepted", value: "accepted"}, {label: "Declined", value: "declined"}]} 
                className="w-full sm:w-auto flex-1 sm:flex-none [&>button]:w-full [&>button]:h-10 [&>button]:text-sm [&>button]:min-w-[130px] [&>button]:rounded-xl [&>button]:bg-white [&>button]:border-gray-200 dark:[&>button]:bg-gray-800/60 dark:[&>button]:border-white/[0.06]"
             />
             <CustomSelect 
                value={eventTimeFilter} 
                onChange={(val) => { setEventTimeFilter(val as "all" | "upcoming" | "past"); setPage(1); }} 
                options={[{label: "All Time", value: "all"}, {label: "Upcoming", value: "upcoming"}, {label: "Past", value: "past"}]} 
                className="w-full sm:w-auto flex-1 sm:flex-none [&>button]:w-full [&>button]:h-10 [&>button]:text-sm [&>button]:min-w-[130px] [&>button]:rounded-xl [&>button]:bg-white [&>button]:border-gray-200 dark:[&>button]:bg-gray-800/60 dark:[&>button]:border-white/[0.06]"
             />
          </div>
        }
      />

      {/* Content */}
      {isMobile ? (
        <div className="space-y-3">
          {displayItems.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <Checkbox checked={allSelected} onChange={toggleAll} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
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
            <div className="py-12 text-center text-gray-400 text-sm">No event attendance records found.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayItems.map((item) => (
                <EventCard 
                  key={item.id || item.public_id} 
                  record={item}
                  isSelected={selectedIds.has(item.id || item.public_id)}
                  onToggle={() => toggleOne(item.id || item.public_id)}
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
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Name</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location & Schedule</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Clock In</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Clock Out</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Invited Status</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Attendance Status</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTable columns={8} rows={5} />
              ) : displayItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-gray-500 text-sm">
                    No event attendance records found.
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
                        <p className="font-medium text-gray-900 dark:text-white mb-1">{record.event?.location || 'No location set'}</p>
                        <p className="text-xs text-gray-500">
                           {record.event?.startTime ? format(parseISO(record.event.startTime), 'dd MMM yy HH:mm') : '-'}
                           {' to '}
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
                             : <Badge color="warning">Not Attended</Badge>}
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
                Showing <span className="font-medium text-gray-900 dark:text-white">{(page - 1) * limit + 1}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * limit, meta.total)}</span> of <span className="font-medium text-gray-900 dark:text-white">{meta.total}</span> records
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.02]">
                  Previous
                </button>
                <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.02]">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
