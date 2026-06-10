import React, { useState, useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceService } from "../../../../api/services/attendanceService";
import { format, startOfWeek, endOfWeek, parseISO } from "date-fns";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../../components/atoms/Table";
import TableToolbar from "../../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../../components/molecules/SkeletonRow";
import CustomSelect from "../../../../components/molecules/CustomSelect";
import DatePicker from "../../../../components/molecules/DatePicker";
import Checkbox from "../../../../components/atoms/Checkbox";
import Badge from "../../../../components/atoms/Badge";
import Avatar from "../../../../components/atoms/Avatar";
import Dropdown from "../../../../components/molecules/Dropdown";
import DropdownItem from "../../../../components/atoms/DropdownItem";

import { useDebounce } from "../../../../hooks/useDebounce";
import { useConfirm } from "../../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../../utils/toast";
import ConfirmDialog from "../../../../components/molecules/ConfirmDialog";

import {
  TrashBinIcon,
  MoreDotIcon,
  EyeIcon,
  CalenderIcon,
  CheckCircleIcon,
  TimeIcon,
  CloseIcon,
} from "../../../../components/atoms/Icons";

import GateCard from "../Cards/GateCard";

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

const RowActionMenu = ({ onDelete, onViewDetails }: { onDelete: () => void, onViewDetails: () => void }) => {
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
        <DropdownItem onClick={() => { setIsOpen(false); onDelete(); }} className="text-error-600 dark:text-error-400 focus:bg-error-50 dark:focus:bg-error-500/10">
          <TrashBinIcon className="size-3.5" /> Delete
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

export default function GateTab() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { confirm, confirmState } = useConfirm();

  // ── Pagination & Filters ──
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfWeek(new Date()), 'yyyy-MM-dd'));
  
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // Clear selection on filter change
  useEffect(() => { setSelectedIds(new Set()); }, [page, debouncedSearch, statusFilter, dateFrom, dateTo]);

  // ── Queries ──
  // Desktop Pagination
  const { data: gateResponse, isLoading: isLoadingDesktop } = useQuery({
    queryKey: ["gateHistory", page, limit, statusFilter, dateFrom, dateTo, debouncedSearch],
    queryFn: () =>
      attendanceService.getAttendanceHistory({
        page,
        limit,
        dateFrom,
        dateTo,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      }),
    enabled: !isMobile,
  });

  // Mobile Infinite
  const { 
    data: gateMobileData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading: isLoadingMobile 
  } = useInfiniteQuery({
    queryKey: ["gateHistoryMobile", limit, statusFilter, dateFrom, dateTo, debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      attendanceService.getAttendanceHistory({
        page: pageParam,
        limit,
        dateFrom,
        dateTo,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      }),
    getNextPageParam: (lastPage) => {
       const current = Number(lastPage.meta?.page || 1);
       const last = lastPage.meta?.totalPages ?? lastPage.meta?.lastPage ?? 1;
       return current < last ? current + 1 : undefined; 
    },
    initialPageParam: 1,
    enabled: isMobile,
  });

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => attendanceService.deleteAttendanceRecord(id),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["gateHistory"] });
        queryClient.invalidateQueries({ queryKey: ["gateHistoryMobile"] });
    }
  });

  // ── Helpers ──
  const displayItems = isMobile ? (gateMobileData?.pages.flatMap(p => p.data) || []) : (gateResponse?.data || []);
  const allSelected = displayItems.length > 0 && displayItems.every((item) => selectedIds.has(item.id || item.public_id));
  const isLoading = isMobile ? isLoadingMobile : isLoadingDesktop;
  const meta = gateResponse?.meta;

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
      title: "Delete Record",
      message: "Are you sure you want to delete this attendance record?",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      showSuccess("Record deleted successfully");
    } catch (err) {
      showError(err, "Failed to delete record");
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Selected",
      message: `Delete ${selectedIds.size} record(s)? This cannot be undone.`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)));
      setSelectedIds(new Set());
      showSuccess("Selected records deleted.");
    } catch (err) {
      showError(err, "Failed to delete some records");
    }
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
      {!isLoading && meta && gateResponse?.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard label="Total Days" value={gateResponse.metrics.totalDays} icon={<CalenderIcon className="text-blue-500" />} />
          <MetricCard label="Present" value={gateResponse.metrics.presentCount} icon={<CheckCircleIcon className="text-green-500" />} />
          <MetricCard label="Late" value={gateResponse.metrics.lateCount} icon={<TimeIcon className="text-yellow-500" />} />
          <MetricCard label="Early Leave" value={gateResponse.metrics.earlyLeaveCount} icon={<TimeIcon className="text-orange-500" />} />
          <MetricCard label="Absent" value={gateResponse.metrics.absentCount} icon={<CloseIcon className="text-red-500" />} />
          <MetricCard label="Attendance %" value={`${gateResponse.metrics.attendancePercentage}%`} icon={<CheckCircleIcon className="text-brand-500" />} />
        </div>
      )}

      {/* Filters & Toolbar */}
      <TableToolbar
        searchValue={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); setPage(1); }}
        searchPlaceholder="Search name, NIS..."
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        bulkActions={[
          {
            label: "Delete Selected",
            icon: <TrashBinIcon className="size-3.5" />,
            onClick: handleBulkDelete,
            variant: "danger",
          },
        ]}
        filters={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DatePicker 
                value={dateFrom} 
                onChange={(d) => { setDateFrom(d); setPage(1); }}
                placeholder="Start Date"
            />
            <DatePicker 
                value={dateTo} 
                onChange={(d) => { setDateTo(d); setPage(1); }}
                placeholder="End Date"
            />
            <CustomSelect
              value={statusFilter}
              onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
              options={[
                { label: "All Status", value: "" },
                { label: "Present", value: "present" },
                { label: "Late", value: "late" },
                { label: "Absent", value: "absent" },
              ]}
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
            <div className="py-12 text-center text-gray-400 text-sm">No gate records found.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayItems.map((item) => (
                <GateCard 
                  key={item.id || item.public_id} 
                  record={item}
                  isSelected={selectedIds.has(item.id || item.public_id)}
                  onToggle={() => toggleOne(item.id || item.public_id)}
                  onDelete={() => handleDelete(item.id || item.public_id)}
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
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Clock In</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Clock Out</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Method</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonTable columns={8} rows={5} />
              ) : displayItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-gray-500 text-sm">
                    No gate attendance records found.
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
                          onViewDetails={() => { /* Implement if needed */ }}
                          onDelete={() => handleDelete(record.id || record.public_id)} 
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

      {/* Confirm Dialog */}
      <ConfirmDialog {...confirmState} />
    </div>
  );
}
