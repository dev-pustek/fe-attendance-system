import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useLeaveSubmissions, useLeaveSubmissionsInfinite, useSubmitLeave, useUpdateSubmission, useDeleteSubmission, useReviewLeave, useLeaveTypes, useLeaveApprovals } from "../../../api/hooks/useLeaves";
import { LeaveSubmission, LeaveStatus } from "../../../api/types/leave";
import { leaveService } from "../../../api/services/leaveService";

import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import DatePicker from "../../../components/molecules/DatePicker";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../utils/toast";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";
import TableActionMenu from "../../../components/molecules/TableActionMenu";
import ImportModal from "../../../components/molecules/ImportModal";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import Button from "../../../components/atoms/Button";

import LeaveSubmissionCard from "./LeaveSubmissionCard";
import LeaveFormModal from "./LeaveFormModal";
import LeaveReviewModal from "./LeaveReviewModal";
import { useDebounce } from "../../../hooks/useDebounce";

import {
  PlusIcon, PencilIcon, TrashBinIcon, ChevronLeftIcon,
  ChevronUpIcon, ChevronDownIcon, AngleRightIcon,
  EyeIcon, CheckCircleIcon, CloseIcon, CalenderIcon,
  GridIcon, FilterIcon, SearchIcon, HorizontaLDots as MoreHorizontalIcon
} from "../../../components/atoms/Icons";

// --- Mobile Hook ---
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return isMobile;
}

// --- Validation Schema ---

// Helper for status badge colors
const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
        case "approved": return "success";
        case "partially_approved": return "warning";
        case "rejected": return "error";
        default: return "light";
    }
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ID", {
        day: "numeric", month: "short", year: "numeric",
    });
};


const LeaveRequests: React.FC = () => {
    const isMobile = useIsMobile();
    
    // --- State: Pagination & Filters ---
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchTerm, setSearchTerm] = useState(""); // Debounced/submitted
    const [statusFilter, setStatusFilter] = useState<LeaveStatus | "ALL">("ALL");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth >= 640);

    const debouncedSearch = useDebounce(searchQuery, 500);

    // Update debounced search
    useEffect(() => {
        setSearchTerm(debouncedSearch);
        setPage(1);
    }, [debouncedSearch]);

    // Sorting
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedEntity, setSelectedEntity] = useState<LeaveSubmission | null>(null);

    // Review State

    // Image Preview Modal
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState("");

    const { confirm, confirmState } = useConfirm();
    const [isImporting, setIsImporting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // --- Hooks ---
    const { data: leaveTypesResponse } = useLeaveTypes({ limit: 100 });
    const leaveTypes = leaveTypesResponse?.data || [];

    // Desktop Paginated Query
    const { data: desktopData, isLoading: isDesktopLoading } = useLeaveSubmissions({
        page, limit,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        userId: searchTerm || undefined, // pending backend search param implementation
    }, { enabled: !isMobile });

    // Mobile Infinite Query
    const { 
        data: mobileData, isLoading: isMobileLoading, isFetchingNextPage, hasNextPage, fetchNextPage 
    } = useLeaveSubmissionsInfinite({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        userId: searchTerm || undefined,
    });

    const createMutation = useSubmitLeave();
    const updateMutation = useUpdateSubmission();
    const deleteMutation = useDeleteSubmission();
    const reviewMutation = useReviewLeave();

    // Determine current data
    const isLoading = isMobile ? isMobileLoading : isDesktopLoading;
    const desktopItems = Array.isArray(desktopData) ? desktopData : (desktopData?.data || []);
    const meta = desktopData?.meta;
    const total = Number(meta?.total || 0);
    const totalPages = Number(meta?.totalPages || meta?.last_page || Math.ceil(total / limit));
    
    const mobileItems = useMemo(() => {
        if (!mobileData) return [];
        return mobileData.pages.flatMap((p: any) => p.data || p || []);
    }, [mobileData]);

    const items = isMobile ? mobileItems : desktopItems;

    // Sorting logic (frontend sort as fallback, though normally done in backend)
    const sortedItems = useMemo(() => {
        if (!sortConfig) return [...items];
        return [...items].sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA: any = "";
            let valB: any = "";
            if (key === "user.name") {
                valA = a.user?.name || "";
                valB = b.user?.name || "";
            } else if (key === "leaveType.displayName") {
                valA = a.leaveType?.displayName || a.leaveType?.code || "";
                valB = b.leaveType?.displayName || b.leaveType?.code || "";
            } else {
                valA = (a as any)[key] || "";
                valB = (b as any)[key] || "";
            }
            if (valA < valB) return direction === "asc" ? -1 : 1;
            if (valA > valB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [items, sortConfig]);

    // Intersection Observer for Infinite Scroll
    const observer = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useCallback((node: HTMLDivElement) => {
        if (isMobileLoading || isFetchingNextPage) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                fetchNextPage();
            }
        });
        if (node) observer.current.observe(node);
    }, [isMobileLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

    // --- Form Setup ---


    // --- Handlers ---
    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key && prev.direction === "asc") return { key, direction: "desc" };
            return { key, direction: "asc" };
        });
    };

    const handleOpenModal = (entity?: LeaveSubmission) => {
        if (entity) {
            setSelectedEntity(entity);
            setIsEditModalOpen(true);
        } else {
            setSelectedEntity(null);
            setIsCreateModalOpen(true);
        }
    };


    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            variant: "delete",
            title: "Hapus Pengajuan Cuti",
            message: "Apakah Anda yakin ingin menghapus pengajuan cuti ini? Tindakan ini tidak dapat dibatalkan."
        });
        if (confirmed) {
            try {
                await deleteMutation.mutateAsync(id);
                showSuccess("Pengajuan cuti berhasil dihapus");
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            } catch (error) {
                showError(error, "Gagal menghapus pengajuan");
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        const count = selectedIds.size;
        const confirmed = await confirm({
            variant: "delete",
            title: `Delete ${count} Requests`,
            message: `Are you sure you want to permanently delete ${count} selected requests?`
        });
        if (confirmed) {
            try {
                await Promise.all(Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id)));
                showSuccess(`Successfully deleted ${count} requests`);
                setSelectedIds(new Set());
            } catch (error) {
                showError(error, "Gagal menghapus beberapa pengajuan");
            }
        }
    };

    const handleOpenReview = (entity: LeaveSubmission) => {
        setSelectedEntity(entity);
        setIsReviewModalOpen(true);
    };


    const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(new Set(sortedItems.map(item => item.public_id)));
        else setSelectedIds(new Set());
    };

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const allSelected = sortedItems.length > 0 && selectedIds.size === sortedItems.length;

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const blob = await leaveService.exportExcel({
                status: statusFilter === "ALL" ? undefined : statusFilter,
                userId: searchTerm || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `leave-submissions-${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showSuccess("Berhasil diekspor ke Excel");
        } catch (error) {
            showError(error, "Gagal mengekspor Excel");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdf = async () => {
        setIsExporting(true);
        try {
            const blob = await leaveService.exportPdf({
                status: statusFilter === "ALL" ? undefined : statusFilter,
                userId: searchTerm || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `leave-submissions-${new Date().toISOString().split("T")[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showSuccess("Berhasil diekspor ke PDF");
        } catch (error) {
            showError(error, "Gagal mengekspor PDF");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await leaveService.downloadTemplate(false);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "leave-submissions-template.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showError(error, "Gagal mengunduh template");
        }
    };

    const handleImportClick = () => {
        setIsImportModalOpen(true);
    };

    const handleImport = async (file: File) => {
        setIsImporting(true);
        try {
            const res = await leaveService.importSubmissions(file);
            showSuccess(`Successfully imported! Created: ${res.data?.created || 0}, Errors: ${res.data?.errors?.length || 0}`);
            
            if (res.data?.errors?.length) {
                console.warn("Kesalahan impor:", res.data.errors);
                alert(`Some rows failed to import:\n${res.data.errors.slice(0, 5).join('\n')}${res.data.errors.length > 5 ? '\n...' : ''}`);
            }

            // Refresh table data
            if (isMobile) {
                // Not ideal, but force re-fetch
                window.location.reload();
            } else {
                window.location.reload(); // Quick fix to ensure it refetches desktop too
            }
            setIsImportModalOpen(false);
        } catch (error) {
            showError(error, "Gagal mengimpor pengajuan cuti");
        } finally {
            setIsImporting(false);
        }
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
        return sortConfig.direction === "asc" ? <ChevronUpIcon className="size-3 text-brand-500" /> : <ChevronDownIcon className="size-3 text-brand-500" />;
    };

    // Row Action Menu Component
    const RowActionMenu = ({ entity }: { entity: LeaveSubmission }) => {
    return (
        <TableActionMenu>
                    <DropdownItem onClick={() => { handleOpenReview(entity); }} 
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10">
                        <EyeIcon className="size-3.5" /> Review
                    </DropdownItem>
                    <DropdownItem onClick={() => { handleOpenModal(entity); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]">
                        <PencilIcon className="size-3.5" /> Edit
                    </DropdownItem>
                    <DropdownItem onClick={() => { handleDelete(entity.public_id); }} 
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10">
                        <TrashBinIcon className="size-3.5" /> Delete
                    </DropdownItem>
                </TableActionMenu>
    );
    };

    return (
        <>
            <PageMeta title="Pengajuan Cuti | SIAPUS" description="Kelola pengajuan cuti pegawai." />
            <div className="hidden sm:block">
                <PageBreadcrumb pageTitle="Pengajuan Cuti" />
            </div>

            <div className="space-y-3 sm:space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengajuan Cuti</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tinjau dan kelola permintaan cuti.</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                        <DataActionsMenu
                            isExporting={isExporting}
                            isImporting={isImporting}
                            onExportExcel={handleExportExcel}
                            onExportPdf={handleExportPdf}
                            onImportClick={handleImportClick}
                            onDownloadTemplate={handleDownloadTemplate}
                        />
                        <button onClick={() => handleOpenModal()}
                            className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]">
                            <PlusIcon className="fill-white size-4" /> Create Request
                        </button>
                    </div>
                </div>

                {/* Mobile FAB */}
                {isMobile && (
                    <MobileFloatingActions
                        onAdd={() => handleOpenModal()}
                        addAriaLabel="Create Request"
                        dataActionsProps={{
                            isExporting,
                            isImporting,
                            onExportExcel: handleExportExcel,
                            onExportPdf: handleExportPdf,
                            onImportClick: handleImportClick,
                            onDownloadTemplate: handleDownloadTemplate
                        }}
                    />
                )}

                {/* Advanced Filter Card */}
                <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-white/[0.05] dark:bg-white/[0.02]">
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)} 
                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                        <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                                <FilterIcon className="size-5 text-brand-500" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                    Search & Filter
                                </h3>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Use criteria to filter submissions by employee, status, and type.
                            </p>
                        </div>
                        <div className="shrink-0 ml-4">
                            <ChevronDownIcon className={`size-5 text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`} />
                        </div>
                    </button>
                    
                    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="overflow-hidden min-h-0">
                            <div className="px-5 pb-5">
                                <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                                
                                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                                    <div className="flex-1 space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                                        <CustomSelect
                                            value={statusFilter}
                                            onChange={(val) => { setStatusFilter(val as LeaveStatus | "ALL"); setPage(1); }}
                                            options={[
                                                { label: "Semua Status", value: "ALL" },
                                                { label: "Menunggu", value: "pending" },
                                                { label: "Disetujui Sebagian", value: "partially_approved" },
                                                { label: "Disetujui", value: "approved" },
                                                { label: "Ditolak", value: "rejected" },
                                            ]}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tipe Cuti</Label>
                                        <CustomSelect
                                            value={typeFilter}
                                            onChange={(val) => { setTypeFilter(String(val)); setPage(1); }}
                                            options={[
                                                { label: "Semua Tipe", value: "ALL" },
                                                ...leaveTypes.map(t => ({ label: t.displayName || t.code, value: t.code }))
                                            ]}
                                        />
                                    </div>

                                    <div className="flex-[2] space-y-1.5">
                                        <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cari</Label>
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Cari berdasarkan Pegawai..."
                                                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setTypeFilter("ALL"); setPage(1); }} 
                                            className="flex h-11 px-6 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300">
                                            Reset
                                        </button>
                                        <button onClick={() => { setSearchTerm(searchQuery); setPage(1); }} 
                                            className="flex h-11 px-6 items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-all hover:bg-brand-600">
                                            <SearchIcon className="size-4" />
                                            Search
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bulk Aksi Toolbar */}
                <TableToolbar 
                    selectedCount={selectedIds.size} 
                    onClearSelection={() => setSelectedIds(new Set())} 
                    bulkAksi={[
                        { label: "Hapus Terpilih", icon: <TrashBinIcon className="size-3.5"/>, onClick: handleBulkDelete, variant: "danger" }
                    ]} 
                />

                {/* Main Content Area */}
                {isMobile ? (
                    <div className="space-y-3">
                        {sortedItems.length > 0 && (
                            <div className="flex items-center gap-3 px-1">
                                <Checkbox checked={allSelected} onChange={toggleAll} />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Pilih semua"}
                                </span>
                            </div>
                        )}
                        {isLoading && items.length === 0 ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-white/5 animate-pulse rounded-2xl" />)}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-500">Tidak ada pengajuan ditemukan.</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {sortedItems.filter(item => typeFilter === 'ALL' || item.leaveTypeCode === typeFilter || item.leaveType?.code === typeFilter).map((item) => (
                                    <LeaveSubmissionCard 
                                        key={item.public_id} 
                                        submission={item}
                                        isSelected={selectedIds.has(item.public_id)}
                                        onToggle={() => toggleOne(item.public_id)}
                                        onEdit={() => handleOpenModal(item)}
                                        onDelete={() => handleDelete(item.public_id)}
                                        onReview={() => handleOpenReview(item)}
                                    />
                                ))}
                            </div>
                        )}
                        {/* Infinite scroll sentinel */}
                        <div ref={sentinelRef} className="py-2 flex items-center justify-center">
                            {isFetchingNextPage && <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
                        <Table>
                            <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                                <TableRow>
                                    <TableCell isHeader className="w-10 px-4 py-3.5"><Checkbox checked={allSelected} onChange={toggleAll} /></TableCell>
                                    <TableCell isHeader className="px-4 py-3.5">
                                        <button onClick={() => handleSort("user.name")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 uppercase tracking-wider">
                                            Pegawai <SortIcon column="user.name" />
                                        </button>
                                    </TableCell>
                                    <TableCell isHeader className="px-4 py-3.5">
                                        <button onClick={() => handleSort("leaveType.displayName")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 uppercase tracking-wider">
                                            Tipe Cuti <SortIcon column="leaveType.displayName" />
                                        </button>
                                    </TableCell>
                                    <TableCell isHeader className="px-4 py-3.5">
                                        <button onClick={() => handleSort("totalDays")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 uppercase tracking-wider">
                                            Durasi <SortIcon column="totalDays" />
                                        </button>
                                    </TableCell>
                                    <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Alasan</TableCell>
                                    <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableCell>
                                    <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <SkeletonTable rows={5} columns={7} />
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-gray-500">Tidak ada pengajuan ditemukan.</TableCell>
                                    </TableRow>
                                ) : (
                                    sortedItems.filter(item => typeFilter === 'ALL' || item.leaveTypeCode === typeFilter || item.leaveType?.code === typeFilter).map(item => (
                                        <TableRow key={item.public_id} className={`group transition-colors ${selectedIds.has(item.public_id) ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"}`}>
                                            <TableCell className="w-10 px-4 py-4">
                                                <Checkbox checked={selectedIds.has(item.public_id)} onChange={() => toggleOne(item.public_id)} />
                                            </TableCell>
                                            <TableCell className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 font-bold overflow-hidden">
                                                        {item.user?.photo ? <img src={item.user.photo} alt={item.user.name} className="w-full h-full object-cover" /> : (item.user?.name.charAt(0) || "U")}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.user?.name}</p>
                                                        <p className="text-[11px] text-gray-500">{item.user?.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-4">
                                                <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                                                    {item.leaveType?.displayName || item.leaveType?.code}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-4">
                                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.totalDays} Hari</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{formatDate(item.startDate)} - {formatDate(item.endDate)}</p>
                                            </TableCell>
                                            <TableCell className="px-4 py-4 max-w-[200px]">
                                                <p className="truncate text-xs text-gray-600 dark:text-gray-300" title={item.reason}>{item.reason}</p>
                                            </TableCell>
                                            <TableCell className="px-4 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <Badge color={getStatusColor(item.status)}>{item.status.replace('_', ' ').toUpperCase()}</Badge>
                                                    {item.leaveType?.approvalLevelsRequired && item.leaveType.approvalLevelsRequired > 1 && (
                                                        <div className="flex items-center gap-1">
                                                            <div className="flex h-1 w-8 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                                                                <div className="h-full bg-brand-500 transition-all duration-500" style={{ width: `${(item.currentApprovalLevel / item.leaveType.approvalLevelsRequired) * 100}%` }} />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-gray-400">{item.currentApprovalLevel}/{item.leaveType.approvalLevelsRequired}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-4 text-center">
                                                <RowActionMenu entity={item} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination (Desktop) */}
                        {!isMobile && (items.length > 0 || total > 0) && (
                            <div className="border-t border-gray-100 dark:border-white/[0.05] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                                    <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                                    <span className="font-medium text-gray-700 dark:text-white">{total}</span> requests
                                </p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                                        <ChevronLeftIcon className="size-4" /> Previous
                                    </button>
                                    <div className="flex items-center gap-1.5 px-2">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{page}</span>
                                        <span className="text-sm text-gray-400">/</span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
                                    </div>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                                        Next <AngleRightIcon className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <LeaveFormModal
                isOpen={isCreateModalOpen || isEditModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setSelectedEntity(null);
                }}
                selectedEntity={selectedEntity}
                leaveTypes={leaveTypes}
            />

            <LeaveReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                selectedEntity={selectedEntity}
            />

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title="Impor Pengajuan Cuti"
                description="Unggah file Excel untuk mengimpor pengajuan cuti secara massal."
                onDownloadTemplate={handleDownloadTemplate}
                onImport={handleImport}
                isImporting={isImporting}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog {...confirmState} />
        </>
    );
};

export default LeaveRequests;
