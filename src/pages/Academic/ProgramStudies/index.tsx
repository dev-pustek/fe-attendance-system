import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useProgramStudiesInfinite, useProgramStudies, useEducationLevels } from "../../../api/hooks/useAcademic";
import { ProgramStudy, CreateProgramStudyDto, UpdateProgramStudyDto } from "../../../api/types/academic";

import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";

import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import Switch from "../../../components/atoms/Switch";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";

import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../utils/toast";

import ProgramStudyCard from "./ProgramStudyCard";

import { useDebounce } from "../../../hooks/useDebounce";

import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AngleRightIcon,
  SearchIcon,
  FilterIcon,
  HorizontaLDots as MoreHorizontalIcon,
  InfoIcon as ProgramIcon,
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

const programStudySchema = z.object({
  code: z.string().min(1, "Kode program harus diisi"),
  name: z.string().min(1, "Nama program harus diisi"),
  educationLevelId: z.number().min(1, "Pilih tingkat pendidikan"),
  isActive: z.boolean().default(true),
});

type ProgramStudyFormValues = z.infer<typeof programStudySchema>;

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

const ProgramStudies: React.FC = () => {
  const isMobile = useIsMobile();

  // ── Pagination & Filters ──
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [educationLevelFilter, setEducationLevelFilter] = useState("all");
  
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const debouncedSearch = useDebounce(searchTerm, 500);
  const { confirm, confirmState } = useConfirm();

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Modal State ──
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramStudy | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProgramStudy; direction: "asc" | "desc" } | null>(null);

  // ── Queries & Mutations ──
  const { data: educationLevelsResp } = useEducationLevels({ limit: 100 });
  const educationLevels = educationLevelsResp?.data || [];

  // Desktop paginated query
  const { data: response, isLoading: isDesktopLoading, createMutation, updateMutation, deleteMutation } = useProgramStudies({
    search: debouncedSearch || undefined,
    educationLevelId: educationLevelFilter === "all" ? undefined : educationLevelFilter,
    isActive: statusFilter === "all" ? undefined : statusFilter === "ACTIVE",
    page,
    limit,
  });

  // Mobile infinite query
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isInfiniteLoading
  } = useProgramStudiesInfinite({
    search: debouncedSearch || undefined,
    educationLevelId: educationLevelFilter === "all" ? undefined : educationLevelFilter,
    isActive: statusFilter === "all" ? undefined : statusFilter === "ACTIVE",
  });

  const isLoading = isMobile ? isInfiniteLoading : isDesktopLoading;
  
  // Flatten infinite items
  const infiniteItems = React.useMemo(() => {
    return infiniteData?.pages.flatMap((p) => p.data) || [];
  }, [infiniteData]);

  const desktopItems = response?.data || [];
  const currentItems = isMobile ? infiniteItems : desktopItems;

  const total = Number(response?.meta?.itemCount ?? response?.meta?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.meta?.totalPages ?? 1);

  // Intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMobile || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage();
      }
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Form Hook Setup ──
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProgramStudyFormValues>({
    resolver: zodResolver(programStudySchema),
    defaultValues: { code: "", name: "", educationLevelId: 0, isActive: true },
  });

  // ── Sorting ──
  const handleSort = (key: keyof ProgramStudy) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = React.useMemo(() => {
    if (!sortConfig || isMobile) return currentItems;
    return [...currentItems].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = String(a[key] ?? "");
      const valB = String(b[key] ?? "");
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [currentItems, sortConfig, isMobile]);

  const SortIcon = ({ column }: { column: keyof ProgramStudy }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  // ── Actions ──
  const handleOpenModal = (program?: ProgramStudy) => {
    if (program) {
      setSelectedProgram(program);
      reset({
        code: program.code,
        name: program.name,
        educationLevelId: Number(program.educationLevelId),
        isActive: program.isActive,
      });
    } else {
      setSelectedProgram(null);
      reset({ code: "", name: "", educationLevelId: 0, isActive: true });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ProgramStudyFormValues) => {
    const confirmed = await confirm({
      variant: selectedProgram ? 'update' : 'create',
      title: selectedProgram ? 'Update Program Studi' : 'Tambah Program Studi',
      message: `Apakah Anda yakin ingin ${selectedProgram ? 'menyimpan perubahan' : 'menambahkan'} program "${data.name}"?`,
    });

    if (!confirmed) return;

    try {
      if (selectedProgram) {
        await updateMutation.mutateAsync({ 
          id: selectedProgram.id,
          data: data as UpdateProgramStudyDto 
        });
        showSuccess(`Program "${data.name}" berhasil diupdate!`);
      } else {
        await createMutation.mutateAsync(data as CreateProgramStudyDto);
        showSuccess(`Program "${data.name}" berhasil ditambahkan!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Gagal menyimpan program studi");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Hapus Program Studi',
      message: 'Apakah Anda yakin ingin menghapus program studi ini? Tindakan ini tidak dapat dibatalkan.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Program studi berhasil dihapus!");
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      } catch (error) {
        showError(error, "Gagal menghapus program studi");
      }
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Hapus Massal Program Studi',
      message: `Anda akan menghapus ${selectedIds.size} program studi. Tindakan ini tidak dapat dibatalkan.`,
    });

    if (confirmed) {
      try {
        // Implement bulk delete via sequential mutations since there's no bulk delete endpoint
        const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id));
        await Promise.all(promises);
        showSuccess(`${selectedIds.size} program studi berhasil dihapus!`);
        setSelectedIds(new Set());
      } catch (error) {
        showError(error, "Gagal menghapus beberapa program studi");
      }
    }
  };

  const handleResetFilter = () => {
    setStatusFilter("all");
    setEducationLevelFilter("all");
    setSearchQuery("");
    setSearchTerm("");
    setPage(1);
  };

  const handleApplySearch = () => {
    setSearchTerm(searchQuery);
    setPage(1);
  };

  const handleNotImplemented = () => {
    showError(new Error("Fitur belum tersedia"), "Mohon maaf");
  };

  // ── Selection Logic ──
  const toggleAll = () => {
    if (selectedIds.size === currentItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentItems.map((i: ProgramStudy) => i.id)));
    }
  };

  const toggleOne = (id: number | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = currentItems.length > 0 && selectedIds.size === currentItems.length;

  // ── Render Helpers ──
  return (
    <>
      <PageMeta title="Program Studi | SIAPUS" description="Kelola program studi dan jurusan." />
      <PageBreadcrumb pageTitle="Program Studi" />

      <div className="space-y-6">
        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <ProgramIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Program Studi</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kelola departemen akademik dan bidang studi.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataActionsMenu
               isExporting={false}
               isImporting={false}
               onExportExcel={handleNotImplemented}
               onExportPdf={handleNotImplemented}
               onImportClick={handleNotImplemented}
               onDownloadTemplate={handleNotImplemented}
            />
            <button onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]">
              <PlusIcon className="fill-white size-4" /> Tambah Program
            </button>
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && (
          <MobileFloatingActions
            onAdd={() => handleOpenModal()}
            addAriaLabel="Tambah Program"
            dataActionsProps={{
               isExporting: false,
               isImporting: false,
               onExportExcel: handleNotImplemented,
               onExportPdf: handleNotImplemented,
               onImportClick: handleNotImplemented,
               onDownloadTemplate: handleNotImplemented
            }}
          />
        )}

        {/* Advanced Filter Card */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-white/[0.05] dark:bg-white/[0.02]">
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors dark:hover:bg-white/[0.02]">
              <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                      <FilterIcon className="size-5 text-brand-500" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          Pencarian & Filter
                      </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                      Gunakan kriteria di bawah untuk memfilter data program studi.
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
                      
                      <div className="grid grid-cols-1 gap-5 items-end lg:grid-cols-12">
                          <div className="space-y-1.5 lg:col-span-3">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                              <CustomSelect
                                  value={statusFilter === "all" ? "" : statusFilter}
                                  onChange={(val) => { setStatusFilter(val ? String(val) : "all"); setPage(1); }}
                                  onClear={() => { setStatusFilter("all"); setPage(1); }}
                                  placeholder="Semua Status"
                                  options={[
                                      { label: "Aktif", value: "ACTIVE" },
                                      { label: "Tidak Aktif", value: "INACTIVE" },
                                  ]}
                                  className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                              />
                          </div>
                          <div className="space-y-1.5 lg:col-span-3">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tingkat Pendidikan</Label>
                              <CustomSelect
                                  value={educationLevelFilter === "all" ? "" : educationLevelFilter}
                                  onChange={(val) => { setEducationLevelFilter(val ? String(val) : "all"); setPage(1); }}
                                  onClear={() => { setEducationLevelFilter("all"); setPage(1); }}
                                  placeholder="Semua Tingkat"
                                  options={educationLevels.map(level => ({ label: level.name, value: String(level.id) }))}
                                  className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                              />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cari</Label>
                              <div className="relative">
                                  <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                  <input
                                      type="text"
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                              handleApplySearch();
                                          }
                                      }}
                                      placeholder="Cari berdasarkan Kode, Nama Program..."
                                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                  />
                              </div>
                          </div>
                          <div className="flex items-center gap-3 lg:col-span-3">
                              <button onClick={handleResetFilter} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]">
                                  Reset
                              </button>
                              <button onClick={handleApplySearch} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-600">
                                  <SearchIcon className="size-4" />
                                  Cari
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        {/* Toolbar (Bulk Actions ONLY) */}
        <TableToolbar selectedCount={selectedIds.size} onClearSelection={() => setSelectedIds(new Set())} bulkActions={[{ label: "Hapus Terpilih", icon: <TrashBinIcon className="size-3.5" />, onClick: handleBulkDelete, variant: "danger" }]} />

        {/* Content */}
        {isMobile ? (
          <div className="space-y-3">
            {/* Select All bar */}
            {currentItems.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} dipilih` : "Pilih semua"}
                </span>
              </div>
            )}

            {/* Mobile Cards */}
            {isLoading && currentItems.length === 0 ? (
               <div className="space-y-3">
                 {[1,2,3].map(i => <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />)}
               </div>
             ) : currentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                  <ProgramIcon className="size-5 opacity-20" />
                </div>
                <p className="text-sm font-medium">Tidak ada program studi.</p>
                <button onClick={() => handleOpenModal()} className="mt-2 flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                  <PlusIcon className="size-4" />
                  Tambah program pertama
                </button>
              </div>
             ) : (
              <div className="grid grid-cols-1 gap-3">
                {currentItems.map((item: ProgramStudy) => (
                  <ProgramStudyCard key={item.id} entity={item}
                    isSelected={selectedIds.has(item.id)}
                    onToggle={() => toggleOne(item.id)}
                    onEdit={() => handleOpenModal(item)}
                    onDelete={() => handleDelete(item.id)} />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!hasNextPage && currentItems.length > 0 && (
                <p className="text-xs text-gray-400">Semua data dimuat</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
              <Table>
                <TableHeader className="bg-gray-50/50 dark:bg-white/[0.02]">
                <TableRow className="hover:bg-transparent">
                  <TableCell isHeader className="w-10 px-4 py-3.5">
                    <Checkbox checked={allSelected} onChange={toggleAll} />
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5">
                    <button onClick={() => handleSort("code")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                      Kode <SortIcon column="code" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5">
                    <button onClick={() => handleSort("name")}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-500 uppercase tracking-wider transition-colors">
                      Nama Program <SortIcon column="name" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tingkat Pendidikan
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading ? (
                  <SkeletonTable columns={6} rows={5} />
                ) : sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                          <ProgramIcon className="size-5 opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Tidak ada program studi.</p>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                          <PlusIcon className="size-4" />
                          Tambah program pertama
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((program: ProgramStudy) => {
                    const isSelected = selectedIds.has(program.id);
                    return (
                      <TableRow key={program.id} className={`group transition-colors ${isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"}`}>
                        <TableCell className="w-10 px-4 py-4">
                          <Checkbox checked={isSelected} onChange={() => toggleOne(program.id)} />
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                            {program.code}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-500">
                              <ProgramIcon className="size-4" />
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{program.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {program.educationLevel?.name || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <Badge color={program.isActive ? "success" : "light"}>
                            {program.isActive ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <RowActionMenu onEdit={() => handleOpenModal(program)} onDelete={() => handleDelete(program.id)} />
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

      {/* ── Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-xl"
        title={selectedProgram ? "Update Program Studi" : "Buat Program Studi Baru"}
        description="Masukkan detail program studi dan tingkat pendidikan terkait."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              type="submit"
              form="program-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedProgram ? "Simpan" : "Buat"}
            </button>
          </div>
        }
      >
          <form id="program-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kode Program</Label>
                    <Input
                        type="text"
                        placeholder="Cth: TI"
                        {...register("code")}
                        error={errors.code?.message}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nama Program</Label>
                    <Input
                        type="text"
                        placeholder="Cth: Teknik Informatika"
                        {...register("name")}
                        error={errors.name?.message}
                    />
                </div>
            </div>

            <Controller
              name="educationLevelId"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tingkat Pendidikan</Label>
                  <CustomSelect
                    value={field.value || ""}
                    onChange={(val) => field.onChange(Number(val))}
                    options={educationLevels.map(level => ({ label: level.name, value: String(level.id) }))}
                    placeholder="Pilih Tingkat Pendidikan"
                    className="w-full"
                  />
                  {errors.educationLevelId && <p className="text-xs text-error-500">{errors.educationLevelId.message}</p>}
                </div>
              )}
            />

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status Program</Label>
                  <div 
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                          field.value 
                          ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                          : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                      }`}
                  >
                      <div className="flex flex-col">
                          <span className={`text-sm font-semibold ${
                              field.value ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                          }`}>
                              {field.value ? "Program Aktif" : "Program Tidak Aktif"}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-500">
                              {field.value ? "Program tersedia untuk pendaftaran siswa." : "Program saat ini dinonaktifkan."}
                          </span>
                      </div>
                      <Switch 
                          checked={field.value}
                          onChange={field.onChange}
                      />
                  </div>
                </div>
              )}
            />
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ProgramStudies;
