import React, { useState, useMemo, useRef, useEffect } from "react";
import TableActionMenu from "../../components/molecules/TableActionMenu";
import { useSearchParams } from "react-router";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { useGuestVisits, useGuestVisitsInfinite, useUpdateGuestVisit, useDeleteGuestVisit, useRegisterGuestVisit, useUpdateGuest } from "../../api/hooks/useGuests";
import { GuestVisit } from "../../api/types/system";
import { 
    ChevronLeftIcon, AngleRightIcon, UserIcon, 
    PencilIcon, TrashBinIcon, CloseIcon, PlusIcon,
    ChevronUpIcon, ChevronDownIcon, CheckCircleIcon,
    FilterIcon, SearchIcon
} from "../../components/atoms/Icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useIsMobile } from "../../hooks/useIsMobile";
import DatePicker from "../../components/molecules/DatePicker";
import Badge from "../../components/atoms/Badge";
import Modal from "../../components/molecules/Modal";
import Label from "../../components/atoms/Label";
import Input from "../../components/atoms/InputField"; 
import PhoneNumberInput from "../../components/atoms/PhoneNumberInput";

import CustomSelect from "../../components/molecules/CustomSelect";
import DataActionsMenu from "../../components/molecules/DataActionsMenu";
import { guestService } from "../../api/services/guestService";

import { SkeletonTable } from "../../components/molecules/SkeletonRow";
import GuestVisitCard from "./GuestVisitCard";
import Dropdown from "../../components/molecules/Dropdown";
import DropdownItem from "../../components/atoms/DropdownItem";
import { MoreDotIcon } from "../../components/atoms/Icons";

const GuestActionDropdown = ({ 
    visit, 
    onCheckOut, 
    onEdit, 
    onDelete 
}: { 
    visit: GuestVisit, 
    onCheckOut: () => void, 
    onEdit: () => void, 
    onDelete: () => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                right: window.innerWidth - rect.right - window.scrollX
            });
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                onClick={toggleMenu}
                className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
            >
                <MoreDotIcon className="size-5" />
            </button>
            
            {isOpen && createPortal(
                <div 
                    className="fixed z-[9999]" 
                    style={{ top: `${coords.top + 4}px`, right: `${coords.right}px` }}
                >
                    <Dropdown
                        isOpen={isOpen}
                        onClose={() => setIsOpen(false)}
                        className="w-36 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900"
                    >
                        {visit.status?.toLowerCase() !== 'completed' && (
                            <DropdownItem
                                onClick={() => { setIsOpen(false); onCheckOut(); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            >
                                <CheckCircleIcon className="size-3.5" /> Check Out
                            </DropdownItem>
                        )}
                        <DropdownItem
                            onClick={() => { setIsOpen(false); onEdit(); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                        >
                            <PencilIcon className="size-3.5" /> Edit
                        </DropdownItem>
                        <DropdownItem
                            onClick={() => { setIsOpen(false); onDelete(); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                        >
                            <TrashBinIcon className="size-3.5" /> Delete
                        </DropdownItem>
                    </Dropdown>
                </div>,
                document.body
            )}
        </div>
    );
};

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const GuestVisits: React.FC = () => {
    const isMobile = useIsMobile();
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const searchTerm = searchParams.get("search") || "";
    const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
    const [sortConfig, setSortConfig] = useState<{ key: keyof GuestVisit | string; direction: "asc" | "desc" } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<GuestVisit | null>(null);

    const [createForm, setCreateForm] = useState({
        name: "",
        phone: "",
        email: "",
        company: "",
        purpose: "",
        idCardNumber: "",
        photoUrl: null as File | null,
    });

    const [editForm, setEditForm] = useState({
        name: "",
        phone: "",
        email: "",
        company: "",
        purpose: "",
        idCardNumber: "",
        photoUrl: null as File | string | null,
        visitDate: "",
        checkIn: "",
        checkOut: "",
        status: "",
    });

    const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
    const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState("");

    
    const { confirm, confirmState } = useConfirm();

    // Hooks
    const queryParams = useMemo(() => ({
        page,
        limit,
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
    }), [page, limit, searchTerm, startDate, endDate]);

    const { data: response, isLoading: isLoadingDesktop } = useGuestVisits(queryParams);

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isLoadingMobile
    } = useGuestVisitsInfinite({
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
    });

    const registerVisitMutation = useRegisterGuestVisit();
    const updateGuestMutation = useUpdateGuest();
    const updateVisitMutation = useUpdateGuestVisit();
    const deleteVisitMutation = useDeleteGuestVisit();

    const visits = useMemo(() => {
        if (isMobile) {
            return infiniteData?.pages.flatMap((p) => p.data || []) || [];
        }
        return Array.isArray(response) ? response : (response?.data || []);
    }, [response, isMobile, infiniteData]);

    const isLoading = isMobile ? isLoadingMobile : isLoadingDesktop;

    const sortedVisits = useMemo(() => {
        if (!sortConfig) return visits;
        return [...visits].sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA: string | number = "";
            let valB: string | number = "";

            if (key === "guest.name") {
                valA = a.guest?.name || "";
                valB = b.guest?.name || "";
            } else {
                valA = (a as unknown as Record<string, string | number>)[key] ?? "";
                valB = (b as unknown as Record<string, string | number>)[key] ?? "";
            }

            if (valA < valB) return direction === "asc" ? -1 : 1;
            if (valA > valB) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [visits, sortConfig]);

    const total = Number(response?.meta?.total ?? 0);
    const totalPages = Number(response?.meta?.totalPages ?? Math.ceil(total / limit));

    // Mobile Infinite Scroll Observer
    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!isMobile) return;
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [isMobile, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Handlers
    const handleSort = (key: keyof GuestVisit | string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }: { column: keyof GuestVisit | string }) => {
        if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
        return sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="size-3 text-brand-500" />
        ) : (
            <ChevronDownIcon className="size-3 text-brand-500" />
        );
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString("en-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return dateString;
        }
    };

    const getStatusBadge = (status: string | null | undefined) => {
        const s = status?.toLowerCase() || "scheduled";
        switch (s) {
            case "completed":
                return <Badge color="success" size="sm" variant="light">Completed</Badge>;
            case "active":
                return <Badge color="primary" size="sm" variant="light" className="animate-pulse">Active</Badge>;
            case "scheduled":
                return <Badge color="warning" size="sm" variant="light">Scheduled</Badge>;
            default:
                return <Badge color="light" size="sm" variant="light">{status}</Badge>;
        }
    };

    const handleCheckOut = async (visit: GuestVisit) => {
        const confirmed = await confirm({
            variant: "update",
            title: "Guest Check-out",
            message: `Are you sure you want to check out ${visit.guest?.name || "this guest"}?`,
        });

        if (!confirmed) return;

        try {
            await updateVisitMutation.mutateAsync({
                visitId: visit.id,
                data: {
                    clockOut: new Date().toISOString(),
                    statusLabel: "Completed",
                }
            });
            showSuccess(`Checked out ${visit.guest?.name || "Guest"}`);
        } catch (error) {
            showError(error, "Failed to check out");
        }
    };

    const handleDelete = async (visit: GuestVisit) => {
        const confirmed = await confirm({
            variant: "delete",
            title: "Delete Visit Record",
            message: `Are you sure you want to delete this visit record for ${visit.guest?.name}?`,
        });

        if (confirmed) {
            try {
                await deleteVisitMutation.mutateAsync(visit.id);
                showSuccess("Visit record deleted successfully");
            } catch (error) {
                showError(error, "Failed to delete visit record");
            }
        }
    };

    const handleEdit = (visit: GuestVisit) => {
        setSelectedVisit(visit);
        setEditForm({
            name: visit.guest?.name || "",
            phone: visit.guest?.phone || "",
            email: visit.guest?.email || "",
            company: visit.guest?.company || "",
            purpose: visit.purpose || "",
            idCardNumber: visit.guest?.idCardNumber || "",
            photoUrl: visit.guest?.photoUrl || null,
            visitDate: visit.visitDate || "",
            checkIn: visit.checkIn || visit.checkInTime || "",
            checkOut: visit.checkOut || visit.checkOutTime || "",
            status: visit.status || "",
        });
        setEditImagePreview(visit.guest?.photoUrl || null);
        setIsEditModalOpen(true);
    };

    const handleViewDetail = (visit: GuestVisit) => {
        setSelectedVisit(visit);
        setIsDetailModalOpen(true);
    };

    const handleCreateSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await registerVisitMutation.mutateAsync({
                name: createForm.name,
                phone: createForm.phone,
                email: createForm.email,
                company: createForm.company,
                purpose: createForm.purpose,
                idCardNumber: createForm.idCardNumber,
                photoUrl: createForm.photoUrl,
            });
            showSuccess("Guest visit registered successfully");
            setIsCreateModalOpen(false);
            setCreateForm({
                name: "",
                phone: "",
                email: "",
                company: "",
                purpose: "",
                idCardNumber: "",
                photoUrl: null,
            });
            setCreateImagePreview(null);
        } catch (error) {
            showError(error, "Failed to create guest visit");
        }
    };

    const handleEditSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedVisit) return;
        
        try {
            // Update Guest Info if changed
            await updateGuestMutation.mutateAsync({
                id: selectedVisit.guest?.public_id || selectedVisit.guestId,
                data: {
                    name: editForm.name,
                    phone: editForm.phone,
                    email: editForm.email,
                    company: editForm.company,
                    purpose: editForm.purpose,
                    idCardNumber: editForm.idCardNumber,
                    photoUrl: editForm.photoUrl instanceof File ? editForm.photoUrl : undefined
                }
            });

            // Update Visit Info
            await updateVisitMutation.mutateAsync({
                visitId: selectedVisit.id,
                data: {
                    date: editForm.visitDate,
                    clockIn: editForm.checkIn || undefined,
                    clockOut: editForm.checkOut || undefined,
                    statusLabel: editForm.status,
                    notes: editForm.purpose,
                }
            });

            showSuccess("Visit record updated successfully");
            setIsEditModalOpen(false);
        } catch (error) {
            showError(error, "Failed to update visit");
        }
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const params = ids && ids.length > 0 ? { ids: ids.join(',') } : queryParams;
            const blob = await guestService.exportVisitsExcel(params);
            downloadBlob(blob, "visits_export.xlsx");
            showSuccess("Exported successfully");
        } catch (err) {
            showError(err, "Failed to export to Excel");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdf = async () => {
        setIsExporting(true);
        try {
            const params = selectedIds.size > 0 ? { ids: Array.from(selectedIds).join(',') } : queryParams;
            const blob = await guestService.exportVisitsPdf(params);
            downloadBlob(blob, "visits_export.pdf");
        } catch (err) {
            showError(err, "Failed to export to PDF");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <PageMeta title="Guest Visits | SIAPUS" description="Monitor and manage guest entrance history." />
            <PageBreadcrumb pageTitle="Guest Visits" />

            <div className="space-y-6">
                <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                            <UserIcon className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Guest Entry Registry</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage monitoring and attendance for school visitors.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DataActionsMenu
                            isExporting={isExporting}
                            onExportExcel={() => handleExportExcel()}
                            onExportPdf={handleExportPdf}
                            
                            
                        />
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="hidden sm:flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                        >
                            <PlusIcon className="fill-white size-5 text-white" />
                            Register Visit
                        </button>
                    </div>
                </div>

                {/* Mobile FAB */}
                {isMobile && (
                    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
                        <DataActionsMenu
                            isExporting={isExporting}
                            onExportExcel={() => handleExportExcel()}
                            onExportPdf={handleExportPdf}
                            
                            
                            isMobileFab={true}
                        />
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
                            aria-label="Register Visit"
                        >
                            <PlusIcon className="size-6 fill-white" />
                        </button>
                    </div>
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
                                Find visits quickly
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
                                
                                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                    <div className="w-full md:w-[220px]">
                                        <DatePicker 
                                            value={startDate} 
                                            onChange={(date) => setStartDate(date)}
                                            placeholder="Start Date"
                                            className="h-11 w-full rounded-xl dark:bg-white/[0.03]"
                                        />
                                    </div>
                                    <div className="w-full md:w-[220px]">
                                        <DatePicker 
                                            value={endDate} 
                                            onChange={(date) => setEndDate(date)}
                                            placeholder="End Date"
                                            className="h-11 w-full rounded-xl dark:bg-white/[0.03]"
                                        />
                                    </div>
                                    <div className="w-full md:flex-1">
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setSearchParams((prev) => {
                                                            const newParams = new URLSearchParams(prev);
                                                            if (searchQuery) newParams.set("search", searchQuery);
                                                            else newParams.delete("search");
                                                            return newParams;
                                                        });
                                                        setPage(1);
                                                    }
                                                }}
                                                placeholder="Search by Name or Email..."
                                                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex w-full items-center gap-3 md:w-auto">
                                        <button
                                            onClick={() => {
                                                setSearchQuery("");
                                                setStartDate("");
                                                setEndDate("");
                                                setSearchParams((prev) => {
                                                    const newParams = new URLSearchParams(prev);
                                                    newParams.delete("search");
                                                    newParams.delete("startDate");
                                                    newParams.delete("endDate");
                                                    return newParams;
                                                });
                                                setPage(1);
                                            }}
                                            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 md:flex-none"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSearchParams((prev) => {
                                                    const newParams = new URLSearchParams(prev);
                                                    if (searchQuery) newParams.set("search", searchQuery); else newParams.delete("search");
                                                    if (startDate) newParams.set("startDate", startDate); else newParams.delete("startDate");
                                                    if (endDate) newParams.set("endDate", endDate); else newParams.delete("endDate");
                                                    return newParams;
                                                });
                                                setPage(1);
                                            }}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition-all hover:bg-brand-600 md:flex-none"
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

                {/* Content Area */}
                {isLoading ? (
                    isMobile ? (
                        <div className="grid grid-cols-1 gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02]">
                                    {/* Header Skeleton */}
                                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02] animate-pulse">
                                        <div className="h-6 w-24 rounded-lg bg-gray-200 dark:bg-white/[0.06]" />
                                        <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-white/[0.06]" />
                                    </div>
                                    
                                    {/* Body Skeleton */}
                                    <div className="flex flex-col p-4 animate-pulse">
                                        <div className="flex items-start gap-3">
                                            <div className="size-12 shrink-0 rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
                                            <div className="flex flex-col space-y-2 py-1 w-full">
                                                <div className="h-4 w-1/2 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                                                <div className="h-3 w-1/3 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <div className="h-4 w-full rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                                            <div className="h-4 w-3/4 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                                        </div>
                                    </div>
                                    
                                    {/* Footer Skeleton */}
                                    <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01] animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-white/[0.06]" />
                                            <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-white/[0.06]" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <SkeletonTable cols={5} rows={limit} />
                    )
                ) : visits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-gray-200 dark:bg-white/[0.02] dark:border-white/[0.05]">
                        <div className="flex size-20 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 mb-6">
                            <UserIcon className="size-10 text-brand-500 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No visit records found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                            {searchQuery ? "No records match your search criteria. Try adjusting your filters." : "Get started by registering a new guest visit."}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
                            >
                                <PlusIcon className="fill-white size-4" /> Register First Visit
                            </button>
                        )}
                    </div>
                ) : isMobile ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                            {visits.map((visit: GuestVisit) => (
                                <GuestVisitCard
                                    key={visit.id}
                                    visit={visit}
                                    onEdit={() => handleEdit(visit)}
                                    onDelete={() => handleDelete(visit)}
                                    onCheckIn={visit.status?.toLowerCase() === 'scheduled' ? () => {} : undefined} // Add Check In logic if implemented
                                    onCheckOut={visit.status?.toLowerCase() === 'active' ? () => handleCheckOut(visit) : undefined}
                                    onViewDetail={() => handleViewDetail(visit)}
                                />
                            ))}
                            {/* Sentinel for infinite scroll */}
                            <div ref={sentinelRef} className="h-4 w-full flex items-center justify-center">
                                {isFetchingNextPage && <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="border-b border-gray-100 bg-gray-50/50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                                    <TableRow>
                                        <TableCell isHeader className="px-5 py-4 text-left">
                                            <button onClick={() => handleSort("guest.name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                                Guest <SortIcon column="guest.name" />
                                            </button>
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-4 text-left">
                                            <button onClick={() => handleSort("purpose")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                                Purpose <SortIcon column="purpose" />
                                            </button>
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-4 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-theme-xs">Status</TableCell>
                                        <TableCell isHeader className="px-5 py-4 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-theme-xs">Time Details</TableCell>
                                        <TableCell isHeader className="px-5 py-4 text-right font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-theme-xs">Actions</TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {sortedVisits.map((visit) => {
                                        return (
                                        <TableRow key={visit.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => handleViewDetail(visit)}>
                                            <TableCell className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 font-bold dark:bg-brand-500/10 text-xs">
                                                        {visit.guest?.photoUrl ? (
                                                            <img src={visit.guest.photoUrl} alt={visit.guest.name} className="size-full rounded-full object-cover" />
                                                        ) : (
                                                            visit.guest?.name?.charAt(0) || "G"
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 dark:text-white text-theme-sm">{visit.guest?.name || "Unknown"}</span>
                                                        <span className="text-xs text-gray-500">{visit.guest?.company || "Personal Visit"}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-5 py-4 max-w-[200px] truncate">
                                                <span className="text-theme-sm text-gray-600 dark:text-gray-400">{visit.purpose || "Meeting"}</span>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                {getStatusBadge(visit.status)}
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                        <div className="size-1 rounded-full bg-brand-500" /> In: 
                                                        <span className="font-mono text-gray-600 dark:text-gray-400 normal-case tracking-normal">{formatDate(visit.checkIn || visit.checkInTime || visit.visitDate)}</span>
                                                    </div>
                                                    {(visit.checkOut || visit.checkOutTime) && (
                                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                            <div className="size-1 rounded-full bg-gray-300" /> Out: 
                                                            <span className="font-mono text-gray-600 dark:text-gray-400 normal-case tracking-normal">{formatDate(visit.checkOut || visit.checkOutTime)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end items-center gap-2 relative">
                                                    <GuestActionDropdown visit={visit} onCheckOut={() => handleCheckOut(visit)} onEdit={() => handleEdit(visit)} onDelete={() => handleDelete(visit)} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {/* Pagination Footer */}
                        {!isLoading && total > 0 && (
                            <div className="border-t border-gray-100 dark:border-white/[0.05] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                                    <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                                    <span className="font-medium text-gray-700 dark:text-white">{total}</span> records
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
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages || 1}</span>
                                    </div>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages || totalPages === 0}
                                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                                    >
                                        Next
                                        <AngleRightIcon className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                className="max-w-6xl"
                title="Register New Visit"
                description="Create a new entry for a physical visitor. This will register the guest and their visit simultaneously."
                footer={
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsCreateModalOpen(false)} 
                            className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            form="create-visit-form"
                            type="submit"
                            disabled={registerVisitMutation.isPending}
                            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 tracking-wide"
                        >
                            {registerVisitMutation.isPending ? "Registering..." : "Register Visit"}
                        </button>
                    </div>
                }
            >
                <div className="p-1">
                    <form id="create-visit-form" onSubmit={handleCreateSubmit} className="flex flex-col lg:flex-row gap-8">
                        {/* LEFT COLUMN: Photo Upload */}
                        <div className="w-full lg:w-[240px] flex-shrink-0 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">Visual Evidence</Label>
                                <div 
                                    onClick={() => document.getElementById('create-photo-upload')?.click()}
                                    className="relative group cursor-pointer"
                                >
                                    <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/[0.02] border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center transition-all group-hover:border-brand-500/50 group-hover:bg-brand-50/10 shadow-inner">
                                        {createImagePreview ? (
                                            <img src={createImagePreview} alt="Preview" className="size-full object-cover" />
                                        ) : (
                                            <div className="text-center space-y-2 p-4">
                                                <UserIcon className="size-12 mx-auto text-gray-300 dark:text-white/10 group-hover:text-brand-500 transition-colors" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Click to<br/>Capture</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 transition-colors flex items-center justify-center">
                                            <PlusIcon className="size-8 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                                        </div>
                                    </div>
                                    <input 
                                        id="create-photo-upload"
                                        type="file" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setCreateForm(prev => ({ ...prev, photoUrl: file }));
                                                const reader = new FileReader();
                                                reader.onloadend = () => setCreateImagePreview(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }} 
                                        className="hidden" 
                                        accept="image/*" 
                                    />
                                </div>
                                {createImagePreview && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCreateImagePreview(null);
                                            setCreateForm(prev => ({...prev, photoUrl: null}));
                                            (document.getElementById('create-photo-upload') as HTMLInputElement).value = "";
                                        }}
                                        className="flex items-center justify-center gap-2 text-sm text-error-500 font-bold hover:underline w-full mt-2"
                                    >
                                        <TrashBinIcon className="size-4" />
                                        Remove Photo
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Inputs Grid */}
                        <div className="flex-1 space-y-6 overflow-y-auto max-h-[70vh] pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                            
                            {/* Visitor Identity */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Visitor Identity</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>Full Guest Name <span className="text-error-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. Robert Smith"
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm(prev => ({...prev, name: e.target.value}))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Email Address</Label>
                                        <Input
                                            placeholder="robert@example.com"
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) => setCreateForm(prev => ({...prev, email: e.target.value}))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <PhoneNumberInput
                                            label="Phone Contact"
                                            placeholder="Enter phone number"
                                            value={createForm.phone}
                                            onChange={(value) => setCreateForm(prev => ({...prev, phone: value}))}
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>National ID / Passport</Label>
                                        <Input
                                            placeholder="Enter identification number"
                                            value={createForm.idCardNumber}
                                            onChange={(e) => setCreateForm(prev => ({...prev, idCardNumber: e.target.value}))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Visit Details */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Visit Information</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>Company / Entity</Label>
                                        <Input
                                            placeholder="e.g. Acme Innovations"
                                            value={createForm.company}
                                            onChange={(e) => setCreateForm(prev => ({...prev, company: e.target.value}))}
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>Purpose of Visit <span className="text-error-500">*</span></Label>
                                        <textarea
                                            value={createForm.purpose}
                                            onChange={(e) => setCreateForm(prev => ({...prev, purpose: e.target.value}))}
                                            rows={3}
                                            placeholder="Describe the reason for entry..."
                                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-800 resize-none shadow-theme-xs"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                className="max-w-6xl"
                title="Edit Visit Details"
                description={`Updating metadata for ${selectedVisit?.guest?.name}'s visit record.`}
                footer={
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsEditModalOpen(false)} 
                            className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            form="edit-visit-form"
                            type="submit"
                            disabled={updateVisitMutation.isPending || updateGuestMutation.isPending}
                            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 tracking-wide"
                        >
                            {updateVisitMutation.isPending || updateGuestMutation.isPending ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                }
            >
                <div className="p-1">
                    <form id="edit-visit-form" onSubmit={handleEditSubmit} className="flex flex-col lg:flex-row gap-8">
                        {/* LEFT COLUMN: Photo Upload & Status */}
                        <div className="w-full lg:w-[240px] flex-shrink-0 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">Visual Evidence</Label>
                                <div 
                                    onClick={() => document.getElementById('edit-photo-upload')?.click()}
                                    className="relative group cursor-pointer"
                                >
                                    <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/[0.02] border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center transition-all group-hover:border-brand-500/50 group-hover:bg-brand-50/10 shadow-inner">
                                        {editImagePreview ? (
                                            <img src={editImagePreview} alt="Preview" className="size-full object-cover" />
                                        ) : (
                                            <div className="text-center space-y-2 p-4">
                                                <UserIcon className="size-12 mx-auto text-gray-300 dark:text-white/10 group-hover:text-brand-500 transition-colors" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Click to<br/>Capture</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 transition-colors flex items-center justify-center">
                                            <PlusIcon className="size-8 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                                        </div>
                                    </div>
                                    <input 
                                        id="edit-photo-upload"
                                        type="file" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setEditForm(prev => ({ ...prev, photoUrl: file }));
                                                const reader = new FileReader();
                                                reader.onloadend = () => setEditImagePreview(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }} 
                                        className="hidden" 
                                        accept="image/*" 
                                    />
                                </div>
                                {editImagePreview && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditImagePreview(null);
                                            setEditForm(prev => ({...prev, photoUrl: null}));
                                            (document.getElementById('edit-photo-upload') as HTMLInputElement).value = "";
                                        }}
                                        className="flex items-center justify-center gap-2 text-sm text-error-500 font-bold hover:underline w-full mt-2"
                                    >
                                        <TrashBinIcon className="size-4" />
                                        Remove Photo
                                    </button>
                                )}
                            </div>

                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-2">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-0">Record Status</Label>
                                <CustomSelect
                                    options={[
                                        { value: "scheduled", label: "Scheduled" },
                                        { value: "active", label: "Active" },
                                        { value: "completed", label: "Completed" },
                                    ]}
                                    value={editForm.status}
                                    onChange={(value) => setEditForm(prev => ({...prev, status: String(value)}))}
                                    placeholder="Select visit status"
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Inputs Grid */}
                        <div className="flex-1 space-y-6 overflow-y-auto max-h-[70vh] pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                            
                            {/* Visitor Identity */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Visitor Identity</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>Full Guest Name <span className="text-error-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. Robert Smith"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Email Address</Label>
                                        <Input
                                            type="email"
                                            placeholder="robert@example.com"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <PhoneNumberInput
                                            label="Phone Contact"
                                            placeholder="Enter phone number"
                                            value={editForm.phone}
                                            onChange={(value) => setEditForm(prev => ({...prev, phone: value}))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Visit Details */}
                            <div className="space-y-4">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Visit Information</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>Company / Entity</Label>
                                        <Input
                                            placeholder="e.g. Acme Innovations"
                                            value={editForm.company}
                                            onChange={(e) => setEditForm(prev => ({...prev, company: e.target.value}))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Visit Date</Label>
                                        <DatePicker 
                                            type="datetime"
                                            value={editForm.visitDate} 
                                            onChange={(date) => setEditForm(prev => ({...prev, visitDate: date}))}
                                        />
                                    </div>
                                    <div className="col-span-1 hidden md:block"></div>
                                    
                                    <div className="space-y-1.5">
                                        <Label>Check In Time</Label>
                                        <DatePicker 
                                            type="datetime"
                                            value={editForm.checkIn} 
                                            onChange={(date) => setEditForm(prev => ({...prev, checkIn: date}))}
                                            placeholder="Auto on arrival"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Check Out Time</Label>
                                        <DatePicker 
                                            type="datetime"
                                            value={editForm.checkOut} 
                                            onChange={(date) => setEditForm(prev => ({...prev, checkOut: date}))}
                                            placeholder="Not checked out"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <Label>Purpose of Visit <span className="text-error-500">*</span></Label>
                                        <textarea
                                            value={editForm.purpose}
                                            onChange={(e) => setEditForm(prev => ({...prev, purpose: e.target.value}))}
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-800 resize-none shadow-theme-xs"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal 
                isOpen={isDetailModalOpen} 
                onClose={() => setIsDetailModalOpen(false)} 
                className="max-w-md" 
                title="Visit Summary"
                description="Comprehensive overview of guest identification and visitation metrics."
            >
                {selectedVisit && (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center">
                            <div className="h-20 w-20 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 shadow-sm dark:bg-brand-500/10">
                                {selectedVisit.guest?.photoUrl ? (
                                    <img 
                                        src={selectedVisit.guest.photoUrl} 
                                        alt="Guest" 
                                        className="h-full w-full object-cover rounded-2xl"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImageUrl(selectedVisit.guest!.photoUrl!);
                                            setIsImagePreviewModalOpen(true);
                                        }}
                                    />
                                ) : (
                                    <UserIcon className="size-10" />
                                )}
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">{selectedVisit.guest?.name}</h4>
                            <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest">{selectedVisit.guest?.company || "Personal Guest"}</p>
                        </div>

                        <div className="space-y-5">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Time Tracking</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-gray-500 block mb-1">Check In:</span>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatDate(selectedVisit.checkIn || selectedVisit.visitDate)}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 block mb-1">Check Out:</span>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedVisit.checkOut ? formatDate(selectedVisit.checkOut) : "Active Now"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="px-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Visit Intent</p>
                                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                    {selectedVisit.purpose}
                                </p>
                            </div>

                            <div className="px-1 pt-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Identification</p>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Contact:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{selectedVisit.guest?.phone || selectedVisit.guest?.email || "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">ID Number:</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{selectedVisit.guest?.idCardNumber || "-"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Global ID:</span>
                                        <span className="font-mono text-[10px] text-gray-400">{selectedVisit.guest?.public_id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Image Preview Modal */}
            <Modal isOpen={isImagePreviewModalOpen} onClose={() => setIsImagePreviewModalOpen(false)} className="max-w-5xl overflow-hidden p-0 border-0 bg-transparent">
                <div className="relative group">
                    <button 
                        onClick={() => setIsImagePreviewModalOpen(false)}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <CloseIcon className="size-6" />
                    </button>
                    <img 
                        src={previewImageUrl} 
                        alt="High definition preview" 
                        className="w-full h-auto max-h-[90vh] object-contain rounded-2xl"
                    />
                </div>
            </Modal>

            <ConfirmDialog {...confirmState} />
        </>
    );
};

export default GuestVisits;
