import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAcademicYears, useAcademicYearsInfinite, useImportAcademicYears } from "../../../api/hooks/useAcademic";
import { AcademicYear } from "../../../api/types/academic";
import { academicService } from "../../../api/services/academicService";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import ImportModal from "../../../components/molecules/ImportModal";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  AngleRightIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CalenderIcon,
  CheckCircleIcon,
  FilterIcon,
  SearchIcon,
} from "../../../components/atoms/Icons";
import DatePicker from "../../../components/molecules/DatePicker";
import Badge from "../../../components/atoms/Badge";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";
import AcademicYearCard from "./AcademicYearCard";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";
import TableActionMenu from "../../../components/molecules/TableActionMenu";

// ─── Blob download helper ────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

const MoreHorizontalIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z" />
  </svg>
);

const RowActionMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
      >
        <MoreHorizontalIcon className="size-5" />
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 top-full z-20 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900"
      >
        <DropdownItem
          onClick={() => {
            setIsOpen(false);
            onEdit();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          <PencilIcon className="size-3.5" /> Edit
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

const academicYearSchema = z.object({
  code: z.string().min(1, "Year code is required"),
  name: z.string().min(1, "Display name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isActive: z.boolean().default(false),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});
type AcademicYearFormValues = z.infer<typeof academicYearSchema>;

const AcademicYears: React.FC = () => {
  const isMobile = useIsMobile();

  // ── Desktop pagination state ─────────────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const { confirm, confirmState } = useConfirm();

  // ── Desktop query ─────────────────────────────────────────────────────────
  const queryParams = {
    search: searchTerm || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  };
  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } =
    useAcademicYears(queryParams);

  // ── Mobile infinite query ─────────────────────────────────────────────────
  const infiniteQuery = useAcademicYearsInfinite({
    search: searchTerm || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
  });

  // ── Import mutation ───────────────────────────────────────────────────────
  const importMutation = useImportAcademicYears();

  const years = response?.data || [];
  const total = Number(response?.meta?.total ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  // Mobile infinite cards
  const infiniteYears = infiniteQuery.data?.pages.flatMap((p: any) => p.data ?? []) ?? [];

  // ── Sentinel for infinite scroll ──────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobile) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
          infiniteQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, infiniteQuery]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof AcademicYear; direction: "asc" | "desc" } | null>(null);
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AcademicYearFormValues>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: { code: "", name: "", startDate: "", endDate: "", isActive: false },
  });

  // Clear selection on filter change
  useEffect(() => { setSelectedIds(new Set()); }, [page, searchTerm, statusFilter]);

  const handleSort = (key: keyof AcademicYear) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedYears = [...years].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = a[key] || "";
    const valB = b[key] || "";
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof AcademicYear }) => {
    if (sortConfig?.key !== column)
      return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc"
      ? <ChevronUpIcon className="size-3 text-brand-500" />
      : <ChevronDownIcon className="size-3 text-brand-500" />;
  };

  // ── Selection helpers ─────────────────────────────────────────────────────
  const displayYears = isMobile ? infiniteYears : sortedYears;
  const allSelected = displayYears.length > 0 && displayYears.every((y: AcademicYear) => selectedIds.has(y.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayYears.map((y: AcademicYear) => y.id)));
  };
  const toggleOne = (id: number | string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Modal ────────────────────────────────────────────────────────────────
  const handleOpenModal = (year?: AcademicYear) => {
    if (year) {
      setSelectedYear(year);
      reset({
        code: year.code,
        name: year.name,
        startDate: year.startDate?.split("T")[0] || "",
        endDate: year.endDate?.split("T")[0] || "",
        isActive: year.isActive,
      });
    } else {
      setSelectedYear(null);
      reset({ code: "", name: "", startDate: "", endDate: "", isActive: false });
    }
    setIsModalOpen(true);
  };

  const onSubmitForm = async (data: AcademicYearFormValues) => {
    const confirmed = await confirm({
      variant: selectedYear ? "update" : "create",
      title: selectedYear ? "Update Academic Year" : "Create Academic Year",
      message: `Are you sure you want to ${selectedYear ? "update" : "create"} the academic year "${data.name}"?`,
    });
    if (!confirmed) return;
    try {
      if (selectedYear) {
        await updateMutation.mutateAsync({ id: selectedYear.id, data });
        showSuccess(`Academic year "${data.name}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(data);
        showSuccess(`Academic year "${data.name}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save academic year");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Academic Year",
      message: "Are you sure you want to delete this academic year? This action cannot be undone.",
    });
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        showSuccess("Academic year deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete academic year");
      }
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Selected",
      message: `Delete ${selectedIds.size} academic year(s)? This cannot be undone.`,
    });
    if (!confirmed) return;
    for (const id of selectedIds) {
      try { await deleteMutation.mutateAsync(id); } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    showSuccess("Selected academic years deleted.");
  };

  // ── Export/Import handlers ────────────────────────────────────────────────
  const handleExportExcel = useCallback(async (ids?: (number | string)[]) => {
    setIsExporting(true);
    try {
      const params = ids && ids.length > 0
        ? { ids: ids.join(',') as any }
        : { search: searchTerm || undefined, isActive: statusFilter === "" ? undefined : statusFilter === "true" };
      const blob = await academicService.exportAcademicYearsExcel(params);
      downloadBlob(blob, "academic-years.xlsx");
      showSuccess("Excel exported successfully!");
    } catch (err) {
      showError(err, "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [searchTerm, statusFilter]);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = selectedIds.size > 0
        ? { ids: Array.from(selectedIds).join(',') as any }
        : { search: searchTerm || undefined, isActive: statusFilter === "" ? undefined : statusFilter === "true" };
      const blob = await academicService.exportAcademicYearsPdf(params);
      downloadBlob(blob, "academic-years.pdf");
      showSuccess("PDF exported successfully!");
    } catch (err) {
      showError(err, "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds, searchTerm, statusFilter]);

  const handleDownloadTemplate = useCallback(async (withData: boolean) => {
    try {
      const blob = await academicService.downloadAcademicYearsTemplate(withData);
      downloadBlob(blob, "academic-years-template.xlsx");
      showSuccess("Template downloaded!");
    } catch (err) {
      showError(err, "Download failed");
    }
  }, []);

  const handleImport = useCallback(async (file: File) => {
    try {
      const result = await importMutation.mutateAsync(file);
      if (result.errors && result.errors.length > 0) {
        showError(null, `Import done with ${result.errors.length} errors. Created: ${result.created}, Updated: ${result.updated}`);
      } else {
        showSuccess(`Import complete! Created: ${result.created}, Updated: ${result.updated}`);
      }
      setIsImportModalOpen(false);
    } catch (err) {
      showError(err, "Import failed");
    }
  }, [importMutation]);

  return (
    <>
      <PageMeta title="Academic Years | Management" description="Manage academic years and periods." />
      <PageBreadcrumb pageTitle="Academic Years" />

      <div className="space-y-5">
        {/* ── Page header ── */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <CalenderIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Academic Periods</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage school years and active status.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataActionsMenu
              isExporting={isExporting}
              isImporting={importMutation.isPending}
              onExportExcel={() => handleExportExcel()}
              onExportPdf={handleExportPdf}
              onExportExcelSelected={selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined}
              selectedCount={selectedIds.size}
              onImportClick={() => setIsImportModalOpen(true)}
              onDownloadTemplate={handleDownloadTemplate}
            />
            {/* Main Add Button (Desktop) */}
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
            >
              <PlusIcon className="fill-white size-4" />
              Add New Year
            </button>
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && (
          <MobileFloatingActions
            onAdd={() => handleOpenModal()}
            addAriaLabel="Add New Year"
            dataActionsProps={{
              isExporting: isExporting,
              isImporting: importMutation.isPending,
              onExportExcel: () => handleExportExcel(),
              onExportPdf: handleExportPdf,
              onExportExcelSelected: selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined,
              selectedCount: selectedIds.size,
              onImportClick: () => setIsImportModalOpen(true),
              onDownloadTemplate: handleDownloadTemplate
            }}
          />
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
                            Search & Filter Academic Years
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Use the criteria below to filter periods based on status.
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
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                                <CustomSelect
                                    value={statusFilter}
                                    onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
                                    options={[
                                        { label: "All Status", value: "" },
                                        { label: "Active", value: "true" },
                                        { label: "Inactive", value: "false" },
                                    ]}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-1 lg:col-span-6">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Search</Label>
                                <div className="relative">
                                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setSearchTerm(searchQuery);
                                                setPage(1);
                                            }
                                        }}
                                        placeholder="Search by code or name..."
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSearchTerm("");
                                        setStatusFilter("");
                                        setPage(1);
                                    }}
                                    className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchTerm(searchQuery);
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

        {/* ── Toolbar ── */}
        <TableToolbar
          selectedCount={selectedIds.size}
          bulkActions={[
            {
              label: "Delete Selected",
              icon: <TrashBinIcon className="size-3.5" />,
              onClick: handleBulkDelete,
              variant: "danger",
            },
          ]}
          onClearSelection={() => setSelectedIds(new Set())}
        />

        {/* ── MOBILE: Card grid + infinite scroll ── */}
        {isMobile ? (
          <div className="space-y-3">
            {/* Mobile "select all" bar */}
            {infiniteYears.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                </span>
              </div>
            )}

            {/* Skeleton on first load */}
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
            ) : infiniteYears.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                  <CalenderIcon className="size-7 opacity-30" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No academic years found</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400"
                >
                  <PlusIcon className="size-3 fill-current" /> Add First Year
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {infiniteYears.map((year: AcademicYear) => (
                  <AcademicYearCard
                    key={year.id}
                    year={year}
                    isSelected={selectedIds.has(year.id)}
                    onToggle={() => toggleOne(year.id)}
                    onEdit={() => handleOpenModal(year)}
                    onDelete={() => handleDelete(year.id)}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {infiniteQuery.isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!infiniteQuery.hasNextPage && infiniteYears.length > 0 && (
                <p className="text-xs text-gray-400">All records loaded</p>
              )}
            </div>
          </div>
        ) : (
          /* ── DESKTOP: Table with pagination ── */
          <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                  <TableRow>
                    <TableCell isHeader className="w-10 px-4 py-3.5">
                      <Checkbox checked={allSelected} onChange={toggleAll} />
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5">
                      <button onClick={() => handleSort("code")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                        Code <SortIcon column="code" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5">
                      <button onClick={() => handleSort("name")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                        Name <SortIcon column="name" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5">
                      <button onClick={() => handleSort("startDate")} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                        Duration <SortIcon column="startDate" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isLoading ? (
                    <SkeletonTable cols={5} hasCheckbox rows={limit} />
                  ) : sortedYears.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                            <CalenderIcon className="size-7 opacity-30" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No academic years found</p>
                            <p className="mt-0.5 text-xs text-gray-400">Try adjusting your search or add a new year.</p>
                          </div>
                          <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400">
                            <PlusIcon className="size-3 fill-current" /> Add First Year
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedYears.map((year) => {
                      const isSelected = selectedIds.has(year.id);
                      return (
                        <TableRow key={year.id} className={`group transition-colors ${isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"}`}>
                          <TableCell className="w-10 px-4 py-4">
                            <Checkbox checked={isSelected} onChange={() => toggleOne(year.id)} />
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                              {year.code}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center gap-2.5">
                              {year.isActive && <CheckCircleIcon className="size-4 shrink-0 text-success-500" />}
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{year.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <CalenderIcon className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
                              <span>{formatDate(year.startDate)}</span>
                              <span className="text-gray-300 dark:text-gray-600">→</span>
                              <span>{formatDate(year.endDate)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <Badge color={year.isActive ? "success" : "light"}>
                              {year.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <RowActionMenu onEdit={() => handleOpenModal(year)} onDelete={() => handleDelete(year.id)} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {total > 0 && (
                <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Showing{" "}
                    <span className="font-semibold text-gray-600 dark:text-gray-300">
                      {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
                    </span>{" "}
                    of <span className="font-semibold text-gray-600 dark:text-gray-300">{total}</span> periods
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                      <ChevronLeftIcon className="size-3.5" /> Prev
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button key={p} onClick={() => setPage(p)} className={`flex size-7 items-center justify-center rounded-lg text-xs font-medium transition ${page === p ? "bg-brand-500 text-white shadow-sm" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400"}`}>
                          {p}
                        </button>
                      );
                    })}
                    {totalPages > 5 && <span className="px-1 text-xs text-gray-400">…</span>}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                      Next <AngleRightIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-md"
        title={selectedYear ? "Update Academic Year" : "Add New Academic Year"}
        description={selectedYear ? "Edit the details of this academic period." : "Fill in the details for the new academic period."}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]">
              Cancel
            </button>
            <button
              type="submit"
              form="academic-year-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-600 disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {selectedYear ? "Save Changes" : "Create Year"}
            </button>
          </div>
        }
      >
        <form id="academic-year-form" onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Year Code</Label>
              <Input type="text" placeholder="e.g. 2024/2025" {...register("code")} error={errors.code?.message} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Display Name</Label>
              <Input type="text" placeholder="e.g. Academic Year 2024/2025" {...register("name")} error={errors.name?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                  <DatePicker label="Start Date" value={field.value} onChange={field.onChange} />
                  {errors.startDate && <p className="text-xs text-error-500">{errors.startDate.message}</p>}
                </div>
              )}
            />
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                  <DatePicker label="End Date" value={field.value} onChange={field.onChange} />
                  {errors.endDate && <p className="text-xs text-error-500">{errors.endDate.message}</p>}
                </div>
              )}
            />
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Checkbox label="Set as Primary / Active Academic Year" checked={field.value} onChange={field.onChange} />
              )}
            />
            <p className="mt-1.5 pl-8 text-xs text-gray-400 dark:text-gray-500">Only one academic year can be active at a time.</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => !importMutation.isPending && setIsImportModalOpen(false)}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        title="Import Academic Years"
        isImporting={importMutation.isPending}
      />
    </>
  );
};

export default AcademicYears;
