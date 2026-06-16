import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import {
  useGuests,
  useGuestsInfinite,
  useDeleteGuest,
  useImportGuests,
} from "../../api/hooks/useGuests";
import { guestService } from "../../api/services/guestService";
import { Guest } from "../../api/types/system";
import {
  ChevronLeftIcon,
  AngleRightIcon,
  UserIcon,
  TrashBinIcon,
  PlusIcon,
  CheckCircleIcon,
  MoreDotIcon,
  EditIcon,
  FilterIcon,
  ChevronDownIcon,
  SearchIcon
} from "../../components/atoms/Icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/atoms/Table";
import { useDebounce } from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../utils/toast";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useIsMobile } from "../../hooks/useIsMobile";
import Dropdown from "../../components/molecules/Dropdown";
import DropdownItem from "../../components/atoms/DropdownItem";
import { SkeletonTable } from "../../components/molecules/SkeletonRow";
import Checkbox from "../../components/atoms/Checkbox";
import DataActionsMenu from "../../components/molecules/DataActionsMenu";
import TableToolbar from "../../components/molecules/TableToolbar";
import ImportModal from "../../components/molecules/ImportModal";

import GuestCard from "./GuestCard";
import GuestFormModal from "./GuestFormModal";
import GuestCheckInModal from "./GuestCheckInModal";

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const RowActionMenu = ({ onEdit, onDelete, onCheckIn }: { onEdit: () => void; onDelete: () => void; onCheckIn: () => void; }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative flex justify-center">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
            >
                <MoreDotIcon className="size-5" />
            </button>
            <Dropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className="absolute right-0 top-full z-20 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900"
            >
                <DropdownItem
                    onClick={() => {
                        setIsOpen(false);
                        onCheckIn();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                >
                    <CheckCircleIcon className="size-3.5" /> Check In
                </DropdownItem>
                <DropdownItem
                    onClick={() => {
                        setIsOpen(false);
                        onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                    <EditIcon className="size-3.5" /> Edit
                </DropdownItem>
                <DropdownItem
                    onClick={() => {
                        setIsOpen(false);
                        onDelete();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                    <TrashBinIcon className="size-3.5" /> Delete
                </DropdownItem>
            </Dropdown>
        </div>
    );
};

const Guests: React.FC = () => {
  const isMobile = useIsMobile();
  
  // State
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const searchTerm = searchParams.get("search") || "";
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Check In Modal State
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  const { confirm, confirmState } = useConfirm();

  const queryParams = useMemo(() => ({
      page,
      limit,
      search: searchTerm || undefined,
  }), [page, limit, searchTerm]);

  // Desktop Hooks
  const { data: guestsResponse, isLoading: isLoadingDesktop } = useGuests(queryParams);

  // Mobile Infinite Query Hooks
  const {
      data: infiniteData,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading: isLoadingMobile
  } = useGuestsInfinite({
      search: searchTerm || undefined,
  });

  const deleteMutation = useDeleteGuest();
  const importMutation = useImportGuests();


  useEffect(() => { setSelectedIds(new Set()); }, [page, searchTerm, isMobile]);

  // Data selection based on view
  const guests = useMemo(() => {
      if (isMobile) {
          return infiniteData?.pages.flatMap((p) => p.data || []) || [];
      }
      return Array.isArray(guestsResponse) ? guestsResponse : guestsResponse?.data || [];
  }, [isMobile, infiniteData, guestsResponse]);

  const allSelected = guests.length > 0 && guests.every((guest: Guest) => selectedIds.has(String(guest.id || guest.public_id)));

  const meta = guestsResponse?.meta;
  const total = Number(meta?.total || 0);
  const totalPages = Number(meta?.totalPages || meta?.lastPage || Math.ceil(total / limit));
  const isLoading = isMobile ? isLoadingMobile : isLoadingDesktop;
  
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
  const handleOpenFormModal = (guest?: Guest) => {
    setSelectedGuest(guest || null);
    setIsFormModalOpen(true);
  };

  const handleOpenCheckInModal = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsCheckInModalOpen(true);
  };

  const handleDelete = async (guest: Guest) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Guest",
      message: `Are you sure you want to delete ${guest.name}? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(Number(guest.id || guest.public_id));
        showSuccess("Guest deleted successfully");
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(String(guest.id || guest.public_id));
            return next;
        });
      } catch (error) {
        showError(error, "Failed to delete guest");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(guests.map((g: Guest) => String(g.id || g.public_id))));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = await confirm({
      variant: "delete",
      title: "Bulk Delete Guests",
      message: `Are you sure you want to permanently delete ${selectedIds.size} selected guests? This action cannot be undone.`,
      confirmText: `Delete ${selectedIds.size} Guests`
    });

    if (confirmed) {
      try {
        const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(Number(id)));
        await Promise.all(promises);
        showSuccess(`Successfully removed ${selectedIds.size} guests.`);
        setSelectedIds(new Set());
      } catch (error) {
        showError(error, "Failed to remove some guests");
      }
    }
  };

  // Export & Import Handlers
  const handleExportExcel = async (ids?: string[]) => {
      setIsExporting(true);
      try {
          const params = ids && ids.length > 0 ? { ids: ids.join(',') } : queryParams;
          const blob = await guestService.exportGuestsExcel(params);
          downloadBlob(blob, "guests_export.xlsx");
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
          const blob = await guestService.exportGuestsPdf(params);
          downloadBlob(blob, "guests_export.pdf");
      } catch (err) {
          showError(err, "Failed to export to PDF");
      } finally {
          setIsExporting(false);
      }
  };

  const handleDownloadTemplate = async (withData: boolean) => {
      setIsDownloadingTemplate(true);
      try {
          const blob = await guestService.downloadGuestsTemplate(withData);
          downloadBlob(blob, "guests_template.xlsx");
          showSuccess("Template downloaded successfully!");
      } catch (err) {
          showError(err, "Failed to download template");
      } finally {
          setIsDownloadingTemplate(false);
      }
  };

  const handleImportSubmit = async (file: File) => {
      try {
          const result = await importMutation.mutateAsync(file);
          showSuccess(`Successfully imported ${result.created} new guests, updated ${result.updated}.`);
          setIsImportModalOpen(false);
      } catch (err) {
          showError(err, "Failed to import guests");
      }
  };

  return (
    <>
      <PageMeta title="Guest Visitors | SIAPUS" description="Manage visitor list." />
      <PageBreadcrumb pageTitle="Guest Visitors" />

      <div className="space-y-6">
        {/* Header - Hidden on Mobile */}
        <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <UserIcon className="size-5" />
              </div>
              <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Guest Visitors</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View and manage registered guests.</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
            <DataActionsMenu
                isExporting={isExporting || isDownloadingTemplate}
                isImporting={importMutation.isPending}
                onExportExcel={() => handleExportExcel()}
                onExportPdf={handleExportPdf}
                onExportExcelSelected={selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined}
                selectedCount={selectedIds.size}
                onImportClick={() => setIsImportModalOpen(true)}
                onDownloadTemplate={() => handleDownloadTemplate(false)}
            />
            <button
                onClick={() => handleOpenFormModal()}
                className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
            >
                <PlusIcon className="fill-white size-4" /> Add New Guest
            </button>
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && (
            <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
                <DataActionsMenu
                    isExporting={isExporting || isDownloadingTemplate}
                    isImporting={importMutation.isPending}
                    onExportExcel={() => handleExportExcel()}
                    onExportPdf={handleExportPdf}
                    onExportExcelSelected={selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined}
                    selectedCount={selectedIds.size}
                    isMobileFab={true}
                    onImportClick={() => setIsImportModalOpen(true)}
                    onDownloadTemplate={() => handleDownloadTemplate(false)}
                />
                <button
                    onClick={() => handleOpenFormModal()}
                    className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
                    aria-label="Add New Guest"
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
                        Find guests quickly
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
                        
                        <div className="grid grid-cols-1 gap-5 items-end md:grid-cols-3">
                            <div className="md:col-span-2 space-y-1.5">
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
                                        placeholder="Search by Name, Email or Phone..."
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 md:col-span-1">
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSearchParams((prev) => {
                                            const newParams = new URLSearchParams(prev);
                                            newParams.delete("search");
                                            return newParams;
                                        });
                                        setPage(1);
                                    }}
                                    className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchParams((prev) => {
                                            const newParams = new URLSearchParams(prev);
                                            if (searchQuery) newParams.set("search", searchQuery);
                                            else newParams.delete("search");
                                            return newParams;
                                        });
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

        {/* Toolbar (Only for Bulk Actions) */}
        <TableToolbar
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
        />

        {/* Content Area */}
        {isLoading ? (
            isMobile ? (
                <div className="grid grid-cols-1 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.06] dark:bg-white/[0.02] animate-pulse space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-gray-200 dark:bg-white/[0.06]" />
                                    <div className="space-y-1.5">
                                        <div className="h-4 w-24 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                                        <div className="h-3 w-16 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                                    </div>
                                </div>
                                <div className="size-5 rounded bg-gray-200 dark:bg-white/[0.06]" />
                            </div>
                            <div className="h-4 w-3/4 rounded-md bg-gray-200 dark:bg-white/[0.06] mt-4" />
                            <div className="h-3 w-1/2 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
                        </div>
                    ))}
                </div>
            ) : (
                <SkeletonTable cols={6} hasCheckbox rows={limit} />
            )
        ) : guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-gray-200 dark:bg-white/[0.02] dark:border-white/[0.05]">
                <div className="flex size-20 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 mb-6">
                    <UserIcon className="size-10 text-brand-500 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No guests found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                    {searchQuery ? "No guests match your search criteria. Try adjusting your filters." : "Get started by adding your first guest to the system."}
                </p>
                {!searchQuery && (
                    <button
                        onClick={() => handleOpenFormModal()}
                        className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
                    >
                        <PlusIcon className="fill-white size-4" /> Add First Guest
                    </button>
                )}
            </div>
        ) : isMobile ? (
            <div className="space-y-3">
                {guests.length > 0 && (
                    <div className="flex items-center gap-3 px-1">
                        <Checkbox checked={allSelected} onChange={handleSelectAll} />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                        </span>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                    {guests.map((guest: Guest) => (
                        <GuestCard
                            key={guest.public_id || guest.id}
                            guest={guest}
                            isSelected={selectedIds.has(String(guest.id || guest.public_id))}
                            onSelect={() => handleSelectRow(String(guest.id || guest.public_id))}
                            onEdit={() => handleOpenFormModal(guest)}
                            onDelete={() => handleDelete(guest)}
                            onCheckIn={() => handleOpenCheckInModal(guest)}
                        />
                    ))}
                    {/* Sentinel for infinite scroll */}
                    <div ref={sentinelRef} className="h-4 w-full flex items-center justify-center">
                        {isFetchingNextPage && <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />}
                    </div>
                </div>
            </div>
        ) : (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                            <TableRow>
                                <TableCell isHeader className="w-10 px-4 py-3.5">
                                    <Checkbox
                                        checked={allSelected}
                                        onChange={handleSelectAll}
                                    />
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 min-w-[200px] text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Guest Name
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Company
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Email
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Phone
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {guests.map((guest: Guest) => (
                                <TableRow key={guest.public_id || guest.id} className={`group transition-colors ${selectedIds.has(String(guest.id || guest.public_id)) ? 'bg-brand-50/60 dark:bg-brand-500/5' : 'hover:bg-gray-50/60 dark:hover:bg-white/[0.015]'}`}>
                                    <TableCell className="w-10 px-4 py-4">
                                        <Checkbox
                                            checked={selectedIds.has(String(guest.id || guest.public_id))}
                                            onChange={() => handleSelectRow(String(guest.id || guest.public_id))}
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                                {guest.photoUrl ? (
                                                    <img src={guest.photoUrl} alt={guest.name} className="size-full rounded-xl object-cover" />
                                                ) : (
                                                    <span className="text-sm font-bold">{guest.name.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {guest.name}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-gray-500 dark:text-gray-400">
                                        {guest.company || "-"}
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-gray-500 dark:text-gray-400">
                                        {guest.email || "-"}
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.05] dark:text-gray-300">
                                            {guest.phone || "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center">
                                        <RowActionMenu 
                                            onCheckIn={() => handleOpenCheckInModal(guest)}
                                            onEdit={() => handleOpenFormModal(guest)}
                                            onDelete={() => handleDelete(guest)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Desktop Pagination */}
                {!isLoadingDesktop && (guests.length > 0 || total > 0) && (
                    <div className="flex flex-col gap-4 border-t border-gray-100 p-4 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
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

      <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportSubmit}
          onDownloadTemplate={() => handleDownloadTemplate(false)}
          title="Import Guests"
          description="Upload an Excel file containing guest information."
          isImporting={importMutation.isPending}
          isDownloadingTemplate={isDownloadingTemplate}
      />

      <GuestFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          selectedEntity={selectedGuest}
      />
      
      <GuestCheckInModal
          isOpen={isCheckInModalOpen}
          onClose={() => setIsCheckInModalOpen(false)}
          selectedGuest={selectedGuest}
      />

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Guests;
