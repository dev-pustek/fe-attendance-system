import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import {
  useClasses,
  useClassesInfinite,
  useDeleteClass,
  useImportClasses,
  useEducationLevels,
  useGrades,
  useMajors
} from "../../../api/hooks/useAcademic";
import { academicService } from "../../../api/services/academicService";
import { Class } from "../../../api/types/academic";
import {
  ChevronLeftIcon,
  AngleRightIcon,
  GridIcon,
  TrashBinIcon,
  PlusIcon,
  FilterIcon,
  ChevronDownIcon,
  SearchIcon,
  MoreDotIcon,
  EditIcon,
  UserIcon,
  GroupIcon,
  MapPinIcon
} from "../../../components/atoms/Icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/atoms/Table";
import { showSuccess, showError } from "../../../utils/toast";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useIsMobile } from "../../../hooks/useIsMobile";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import Label from "../../../components/atoms/Label";
import CustomSelect from "../../../components/molecules/CustomSelect";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import TableToolbar from "../../../components/molecules/TableToolbar";
import ImportModal from "../../../components/molecules/ImportModal";

import ClassCard from "./ClassCard";
import ClassFormModal from "./ClassFormModal";

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const RowActionMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void; }) => {
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

const Classes: React.FC = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const searchTerm = searchParams.get("search") || "";
  
  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [levelFilter, setLevelFilter] = useState(searchParams.get("level") || "all");
  const [gradeFilter, setGradeFilter] = useState(searchParams.get("grade") || "all");
  const [majorFilter, setMajorFilter] = useState(searchParams.get("major") || "all");
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const { confirm, confirmState } = useConfirm();

  const queryParams = useMemo(() => ({
      page,
      limit,
      search: searchTerm || undefined,
      isActive: statusFilter === "all" ? undefined : statusFilter === "ACTIVE",
      educationLevelId: levelFilter === "all" ? undefined : Number(levelFilter),
      gradeId: gradeFilter === "all" ? undefined : Number(gradeFilter),
      majorId: majorFilter === "all" ? undefined : Number(majorFilter)
  }), [page, limit, searchTerm, statusFilter, levelFilter, gradeFilter, majorFilter]);

  // Desktop Hooks
  const { data: response, isLoading: isLoadingDesktop } = useClasses(queryParams);

  // Mobile Infinite Query Hooks
  const {
      data: infiniteData,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading: isLoadingMobile
  } = useClassesInfinite({
      search: searchTerm || undefined,
      isActive: statusFilter === "all" ? undefined : statusFilter === "ACTIVE",
      educationLevelId: levelFilter === "all" ? undefined : Number(levelFilter),
      gradeId: gradeFilter === "all" ? undefined : Number(gradeFilter),
      majorId: majorFilter === "all" ? undefined : Number(majorFilter)
  });

  const deleteMutation = useDeleteClass();
  const importMutation = useImportClasses();

  // Reference Data for Filters
  const { data: levelsData } = useEducationLevels({ isActive: true });
  const educationLevels = levelsData?.data || [];
  
  const { data: gradesData } = useGrades({ 
      educationLevelId: levelFilter !== "all" ? Number(levelFilter) : undefined,
      limit: 100 
  });
  const grades = gradesData?.data || [];
  
  const { data: majorsData } = useMajors({ 
      educationLevelId: levelFilter !== "all" ? Number(levelFilter) : undefined,
      isActive: true,
      limit: 100 
  });
  const majors = majorsData?.data || [];

  // Data selection based on view
  const classes = useMemo(() => {
      if (isMobile) {
          return infiniteData?.pages.flatMap((p) => p.data || []) || [];
      }
      return Array.isArray(response) ? response : response?.data || [];
  }, [isMobile, infiniteData, response]);

  const meta = response?.meta;
  const total = Number(meta?.total || response?.total || 0);
  const totalPages = Number(meta?.totalPages || response?.totalPages || Math.ceil(total / limit));
  const isLoading = isMobile ? isLoadingMobile : isLoadingDesktop;
  
  const allSelected = classes.length > 0 && selectedIds.size === classes.length;

  useEffect(() => { setSelectedIds(new Set()); }, [page, queryParams, isMobile]);

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
  const handleOpenFormModal = (cls?: Class) => {
    setSelectedClass(cls || null);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (cls: Class) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Class",
      message: `Are you sure you want to delete ${cls.name}? This action cannot be undone.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(Number(cls.id));
        showSuccess("Class deleted successfully");
      } catch (error) {
        showError(error, "Failed to delete class");
      }
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(classes.map((c: Class) => String(c.id))));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = await confirm({
      variant: "delete",
      title: "Bulk Delete Classes",
      message: `Are you sure you want to permanently delete ${selectedIds.size} selected classes? This action cannot be undone.`,
      confirmText: `Delete ${selectedIds.size} Classes`
    });

    if (confirmed) {
      try {
        const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(Number(id)));
        await Promise.all(promises);
        showSuccess(`Successfully removed ${selectedIds.size} classes.`);
        setSelectedIds(new Set());
      } catch (error) {
        showError(error, "Failed to remove some classes");
      }
    }
  };

  const updateFilter = (key: string, value: string) => {
      setSearchParams((prev) => {
          const newParams = new URLSearchParams(prev);
          if (value === "all") newParams.delete(key);
          else newParams.set(key, value);
          return newParams;
      });
      setPage(1);
      if (key === "level") {
          setGradeFilter("all");
          setMajorFilter("all");
          setSearchParams((prev) => {
              const newParams = new URLSearchParams(prev);
              newParams.delete("grade");
              newParams.delete("major");
              return newParams;
          });
      }
      if (key === "status") setStatusFilter(value);
      if (key === "level") setLevelFilter(value);
      if (key === "grade") setGradeFilter(value);
      if (key === "major") setMajorFilter(value);
  };

  // Export & Import Handlers
  const handleExportExcel = async (ids?: string[]) => {
      setIsExporting(true);
      try {
          const params = ids && ids.length > 0 ? { ids: ids.join(',') } : queryParams;
          const blob = await academicService.exportClassesExcel(params);
          downloadBlob(blob, "classes_export.xlsx");
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
          const blob = await academicService.exportClassesPdf(params);
          downloadBlob(blob, "classes_export.pdf");
      } catch (err) {
          showError(err, "Failed to export to PDF");
      } finally {
          setIsExporting(false);
      }
  };

  const handleDownloadTemplate = async (withData: boolean) => {
      setIsDownloadingTemplate(true);
      try {
          const blob = await academicService.downloadClassesTemplate(withData);
          downloadBlob(blob, "classes_template.xlsx");
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
          showSuccess(`Successfully imported ${result.created} new classes, updated ${result.updated}.`);
          setIsImportModalOpen(false);
      } catch (err) {
          showError(err, "Failed to import classes");
      }
  };

  return (
    <>
      <PageMeta title="Class Registry | Visia" description="Manage system classes." />
      <PageBreadcrumb pageTitle="Class Registry" />

      <div className="space-y-6">
        {/* Header - Hidden on Mobile */}
        <div className="hidden sm:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <GridIcon className="size-5" />
              </div>
              <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Class Registry</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View and manage classes.</p>
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
                <PlusIcon className="fill-white size-4" /> Add New Class
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
                    aria-label="Add New Class"
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
                        Find classes quickly by status, level, grade, etc.
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
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Level</Label>
                                <CustomSelect
                                    value={levelFilter === "all" ? "" : levelFilter}
                                    onChange={(val) => updateFilter("level", val ? String(val) : "all")}
                                    onClear={() => updateFilter("level", "all")}
                                    placeholder="All Levels"
                                    options={educationLevels.map((l: { id: number | string; name: string }) => ({ label: l.name, value: String(l.id) }))}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Grade</Label>
                                <CustomSelect
                                    value={gradeFilter === "all" ? "" : gradeFilter}
                                    onChange={(val) => updateFilter("grade", val ? String(val) : "all")}
                                    onClear={() => updateFilter("grade", "all")}
                                    placeholder="All Grades"
                                    options={grades.map((g: { id: number | string; name: string }) => ({ label: `Grade ${g.name}`, value: String(g.id) }))}
                                    disabled={levelFilter === "all"}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Major</Label>
                                <CustomSelect
                                    value={majorFilter === "all" ? "" : majorFilter}
                                    onChange={(val) => updateFilter("major", val ? String(val) : "all")}
                                    onClear={() => updateFilter("major", "all")}
                                    placeholder="All Majors"
                                    options={majors.map((m: { id: number | string; name: string }) => ({ label: m.name, value: String(m.id) }))}
                                    disabled={levelFilter === "all"}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                                <CustomSelect
                                    value={statusFilter === "all" ? "" : statusFilter}
                                    onChange={(val) => updateFilter("status", val ? String(val) : "all")}
                                    onClear={() => updateFilter("status", "all")}
                                    placeholder="All Status"
                                    options={[
                                        { label: "Active", value: "ACTIVE" },
                                        { label: "Inactive", value: "INACTIVE" },
                                    ]}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                        </div>

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
                                        placeholder="Search by Code or Name..."
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
                                    <div className="space-y-1.5">
                                        <div className="h-4 w-24 rounded-md bg-gray-200 dark:bg-white/[0.06]" />
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
        ) : classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-gray-200 dark:bg-white/[0.02] dark:border-white/[0.05]">
                <div className="flex size-20 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 mb-6">
                    <GridIcon className="size-10 text-brand-500 opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No classes found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                    {searchQuery || statusFilter !== "all" ? "No classes match your search criteria. Try adjusting your filters." : "Get started by adding your first class to the system."}
                </p>
                {!searchQuery && statusFilter === "all" && (
                    <button
                        onClick={() => handleOpenFormModal()}
                        className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
                    >
                        <PlusIcon className="fill-white size-4" /> Add First Class
                    </button>
                )}
            </div>
        ) : isMobile ? (
            <div className="grid grid-cols-1 gap-3">
                {classes.map((cls: Class) => (
                    <ClassCard
                        key={cls.id}
                        classData={cls}
                        isSelected={selectedIds.has(String(cls.id))}
                        onToggle={() => toggleOne(String(cls.id))}
                        onEdit={() => handleOpenFormModal(cls)}
                        onDelete={() => handleDelete(cls)}
                    />
                ))}
                {/* Sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-4 w-full flex items-center justify-center">
                    {isFetchingNextPage && <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />}
                </div>
            </div>
        ) : (
            <>
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                <TableRow>
                                <TableCell isHeader className="w-10 px-4 py-3.5">
                                    <Checkbox
                                        checked={allSelected}
                                        onChange={toggleAll}
                                    />
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Code
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 min-w-[160px] text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Name
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Details
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Teacher
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </TableCell>
                                <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map((cls: Class) => (
                                <TableRow key={cls.id} className={`group transition-colors ${selectedIds.has(String(cls.id)) ? 'bg-brand-50/60 dark:bg-brand-500/5' : 'hover:bg-gray-50/60 dark:hover:bg-white/[0.015]'}`}>
                                    <TableCell className="w-10 px-4 py-4">
                                        <Checkbox
                                            checked={selectedIds.has(String(cls.id))}
                                            onChange={() => toggleOne(String(cls.id))}
                                        />
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                                            {cls.code}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <p className="font-medium text-gray-900 dark:text-white">{cls.name}</p>
                                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                            {cls.grade?.name && <span>Gr. {cls.grade.name}</span>}
                                            {cls.major?.name && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <span>{cls.major.name}</span>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                                            {cls.roomNumber && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPinIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                                                    <span className="font-medium">Room {cls.roomNumber}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <GroupIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                                                <span className="font-medium">{cls.maxCapacity || "-"} Cap.</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <UserIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                                            <span className="font-medium truncate max-w-[120px]">
                                                {cls.homeroomTeacher?.name || "No Teacher"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center">
                                        <Badge color={cls.isActive ? "success" : "light"}>
                                            {cls.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-4 text-center">
                                        <RowActionMenu 
                                            onEdit={() => handleOpenFormModal(cls)}
                                            onDelete={() => handleDelete(cls)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>

                    {/* Pagination */}
                    {!isLoadingDesktop && (classes.length > 0 || total > 0) && (
                        <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Showing{" "}
                                <span className="font-semibold text-gray-600 dark:text-gray-300">
                                    {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
                                </span>{" "}
                                of <span className="font-semibold text-gray-600 dark:text-gray-300">{total}</span>
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

      <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportSubmit}
          onDownloadTemplate={() => handleDownloadTemplate(false)}
          title="Import Classes"
          description="Upload an Excel file containing class information."
          isImporting={importMutation.isPending}
          isDownloadingTemplate={isDownloadingTemplate}
      />

      <ClassFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          selectedEntity={selectedClass}
      />

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Classes;
