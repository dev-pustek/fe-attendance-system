import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAttendanceList, useAttendanceListInfinite } from "../../../api/hooks/useAttendance";
import { AttendanceRecord, AttendanceParams } from "../../../api/types/attendance";
import { attendanceService } from "../../../api/services/attendanceService";
import { analyticsService } from "../../../api/services/analyticsService";
import { ExportPayload } from "./ExportFilterModal";

import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";
import CustomSelect from "../../../components/molecules/CustomSelect";
import DatePicker from "../../../components/molecules/DatePicker";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";

import AttendanceReportCard from "./AttendanceReportCard";
import ExportFilterModal from "./ExportFilterModal";
import { useDebounce } from "../../../hooks/useDebounce";

import {
  FilterIcon,
  SearchIcon,
  ChevronDownIcon,
  DocsIcon,
} from "../../../components/atoms/Icons";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

export default function AttendanceReports() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // ── Pagination & Filters ──
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Specific filters (Basic for page view)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Debounce search typing
  const debouncedSearch = useDebounce(searchQuery, 500);
  useEffect(() => {
    setSearchTerm(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  const queryParams: AttendanceParams = {
    page,
    limit,
    search: searchTerm || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    ...(statusFilter !== "all" && statusFilter === "late" && { isLate: true }),
    ...(statusFilter !== "all" && statusFilter === "present" && { isPresent: true }),
  };

  // ── Data Fetching ──
  const {
    data: desktopData,
    isLoading: isDesktopLoading,
    isFetching: isDesktopFetching,
  } = useAttendanceList(isMobile ? undefined : queryParams);

  const {
    data: infiniteData,
    isLoading: isInfiniteLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useAttendanceListInfinite(isMobile ? queryParams : undefined);

  // Intersection Observer for mobile infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobile || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "100px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Derived state
  const items = isMobile
    ? infiniteData?.pages.flatMap((page) => page.data) || []
    : desktopData?.data || [];
  
  const isLoading = isMobile ? isInfiniteLoading : isDesktopLoading;
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  // ── Handlers ──
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.public_id || (i as any).id)));
    }
  };

  const toggleOne = (id: number | string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleResetFilter = () => {
    setSearchQuery("");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
    setPage(1);
  };

  // This handles the actual export using payload from ExportFilterModal
  const executeExportCSV = async (payload: ExportPayload) => {
    setIsExporting(true);
    try {
      if (payload.type === "attendance") {
        const res = await attendanceService.getAttendanceList(payload.params);
        const rows = res.data;
        if (!rows.length) {
          alert("Tidak ada data kehadiran untuk diekspor berdasarkan filter tersebut.");
          setIsExporting(false);
          return;
        }

        const headers = ["Tanggal", "Nama", "Kelas", "Check-in", "Check-out", "Status"];
        const csvContent = [
          headers.join(","),
          ...rows.map(row => 
            [
              row.date,
              `"${row.studentName || row.user?.name || row.user?.full_name || ''}"`,
              `"${row.className || row.class?.name || ''}"`,
              row.clockIn || '',
              row.clockOut || '',
              row.statusLabel || ''
            ].join(",")
          )
        ].join("\n");
        downloadFile(csvContent, `Laporan_Kehadiran_${new Date().toISOString().split('T')[0]}.csv`);

      } else if (payload.type === "teaching_session") {
        const res = await attendanceService.getTeachingSessions(payload.params);
        const rows = res.data;
        if (!rows.length) {
          alert("Tidak ada data JP/Sesi Mengajar untuk diekspor berdasarkan filter tersebut.");
          setIsExporting(false);
          return;
        }

        const headers = ["Tanggal", "Guru", "Mata Pelajaran", "Waktu Mulai", "Waktu Selesai", "Total JP", "Substitusi", "Status Validasi"];
        const csvContent = [
          headers.join(","),
          ...rows.map(row => 
            [
              row.sessionDate,
              `"${row.actualTeacherId || 'Unknown'}"`, // Would normally be mapped to teacher name if joined
              `"${row.classSubjectId || 'Unknown'}"`,
              row.startTime || '',
              row.endTime || '',
              row.teachingUnits || 0,
              row.isSubstitution ? "Ya" : "Tidak",
              row.validationStatus || "pending"
            ].join(",")
          )
        ].join("\n");
        downloadFile(csvContent, `Laporan_JP_${new Date().toISOString().split('T')[0]}.csv`);

      } else if (payload.type === "performance") {
        const blob = await analyticsService.exportBenchmarkExcel(payload.params);
        
        if (!blob || blob.size === 0) {
          alert("Tidak ada data Benchmarking untuk diekspor.");
          setIsExporting(false);
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Laporan_Kinerja_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }

      setIsExportModalOpen(false);
    } catch (error: any) {
      console.error("Export failed", error);
      let errMsg = error?.message || "Unknown error";
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errMsg = json.message || errMsg;
        } catch (e) {
          // ignore
        }
      } else if (error?.response?.data?.message) {
        errMsg = error.response.data.message;
      }
      alert(`Gagal mengekspor data: ${errMsg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusConfig = (status: string, present: boolean, isLate: boolean) => {
    if (status === 'excused') return { label: 'Dispensasi', color: 'blue' as const };
    if (!present) return { label: 'Absen', color: 'error' as const };
    if (isLate) return { label: 'Terlambat', color: 'warning' as const };
    return { label: 'Hadir', color: 'success' as const };
  };

  return (
    <>
      <PageMeta title="Laporan Kehadiran | Attendance System" description="Laporan riwayat kehadiran pegawai dan murid" />
      <PageBreadcrumb pageTitle="Laporan Kehadiran" />

      <div className="space-y-6">
        {/* Page Header - Desktop Only */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <DocsIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Laporan Kehadiran</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rekapitulasi data kehadiran untuk keperluan administrasi.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataActionsMenu
              isExporting={isExporting}
              onExportExcel={() => setIsExportModalOpen(true)}
            />
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && (
            <MobileFloatingActions
                dataActionsProps={{
                    isExporting,
                    onExportExcel: () => setIsExportModalOpen(true)
                }}
            />
        )}

        {/* Basic Filter Card */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden">
          <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
              <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                      <FilterIcon className="size-5 text-brand-500" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          Pencarian & Tampilan
                      </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                      Cari data kehadiran berdasarkan nama atau tanggal. Klik Export untuk filter kompleks.
                  </p>
              </div>
              <div className="shrink-0 ml-4">
                  <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
              </div>
          </button>
          
          <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                  isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}>
              <div className="overflow-hidden min-h-0">
                  <div className="px-5 pb-5">
                      <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                      
                      <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Mulai</Label>
                              <DatePicker value={startDate} onChange={setStartDate} placeholder="Pilih tanggal" />
                          </div>
                          <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Akhir</Label>
                              <DatePicker value={endDate} onChange={setEndDate} placeholder="Pilih tanggal" />
                          </div>
                          <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status Absen</Label>
                              <CustomSelect
                                  value={statusFilter === "all" ? "" : statusFilter}
                                  onChange={(val) => { setStatusFilter(val ? String(val) : "all"); setPage(1); }}
                                  onClear={() => { setStatusFilter("all"); setPage(1); }}
                                  placeholder="Semua Status"
                                  options={[
                                      { label: "Hadir", value: "present" },
                                      { label: "Terlambat", value: "late" },
                                      { label: "Absen/Alpha", value: "absent" },
                                      { label: "Dispensasi", value: "excused" },
                                  ]}
                                  className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                              />
                          </div>
                          <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cari Nama / NIS</Label>
                              <div className="relative">
                                  <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                  <input
                                      type="text"
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      placeholder="Ketik nama atau NIS..."
                                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                                  />
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex justify-end items-center gap-3">
                          <button onClick={handleResetFilter} className="h-11 px-6 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300">
                              Reset
                          </button>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        <TableToolbar selectedCount={selectedIds.size} onClearSelection={() => setSelectedIds(new Set())} bulkActions={[]} />

        {/* Content */}
        {isMobile ? (
          <div className="space-y-3">
            {items.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} dipilih` : "Pilih semua"}
                </span>
              </div>
            )}
            
            {isLoading && items.length === 0 ? (
               <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-28 w-full rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800" />)}
               </div>
            ) : items.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-10 text-center text-gray-500">
                  <DocsIcon className="size-10 mb-4 text-gray-300" />
                  <p>Tidak ada data laporan ditemukan</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {items.map((item, idx) => {
                  const itemId = item.public_id || (item as any).id || idx;
                  return (
                    <AttendanceReportCard 
                      key={itemId} 
                      entity={item} 
                      isSelected={selectedIds.has(itemId)}
                      onToggle={() => toggleOne(itemId)} 
                    />
                  );
                })}
              </div>
            )}
            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {isFetchingNextPage && <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                  <TableRow>
                    <TableCell isHeader className="w-10 px-4 py-3.5">
                      <Checkbox checked={allSelected} onChange={toggleAll} />
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Tanggal</TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Nama</TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">In/Out</TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase text-center">Status</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && items.length === 0 ? (
                    <SkeletonTable rows={5} columns={5} />
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-gray-500">
                        Tidak ada laporan kehadiran
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row, idx) => {
                      const rowId = row.public_id || (row as any).id || idx;
                      const isSelected = selectedIds.has(rowId);
                      const sc = getStatusConfig(row.statusLabel, row.isPresent, row.isLate);
                      return (
                        <TableRow key={rowId} className={`group transition-colors ${isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"}`}>
                          <TableCell className="w-10 px-4 py-4"><Checkbox checked={isSelected} onChange={() => toggleOne(rowId)} /></TableCell>
                          <TableCell className="px-4 py-4 text-sm font-medium">{row.date}</TableCell>
                          <TableCell className="px-4 py-4 text-sm">
                            <div className="font-semibold text-gray-900 dark:text-white">{row.studentName || row.user?.name || row.user?.full_name || 'Unknown User'}</div>
                            <div className="text-xs text-gray-500">{row.className || row.class?.name || 'Tanpa Kelas'}</div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                            {row.clockIn?.slice(0,5) || '--:--'} / {row.clockOut?.slice(0,5) || '--:--'}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <Badge color={sc.color}>{sc.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Desktop Pagination */}
            {!isLoading && desktopData && desktopData.meta && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <div className="text-sm text-gray-500 font-medium">
                  Menampilkan {items.length} dari {desktopData.meta.itemCount || desktopData.meta.totalItems} catatan
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700"
                  >
                    Sebelumnya
                  </button>
                  <button 
                    disabled={page === desktopData.meta.totalPages}
                    onClick={() => setPage(p => Math.min(desktopData.meta.totalPages, p + 1))}
                    className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ExportFilterModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onExport={executeExportCSV} 
        isExporting={isExporting} 
      />
    </>
  );
}
