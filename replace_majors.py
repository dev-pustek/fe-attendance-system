import os

content = """import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { 
  useMajors, 
  useMajorsInfinite, 
  useImportMajors,
  useEducationLevels, 
  useProgramStudies 
} from "../../../api/hooks/useAcademic";
import { Major, CreateMajorDto, UpdateMajorDto } from "../../../api/types/academic";
import { academicService } from "../../../api/services/academicService";

import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";

import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import ImportModal from "../../../components/molecules/ImportModal";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import Switch from "../../../components/atoms/Switch";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";

import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../utils/toast";

import MajorCard from "./MajorCard";

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
  InfoIcon as MajorIcon,
  HorizontaLDots as MoreHorizontalIcon,
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const majorSchema = z.object({
  code: z.string().min(1, "Kode jurusan wajib diisi"),
  name: z.string().min(1, "Nama jurusan wajib diisi"),
  educationLevelId: z.number({ invalid_type_error: "Tingkat pendidikan wajib dipilih" }).min(1, "Tingkat pendidikan wajib dipilih"),
  programStudyId: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

type MajorFormValues = z.infer<typeof majorSchema>;

const RowActionMenu = ({ onEdit, onDelete }: { onEdit: () => void, onDelete: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative flex justify-center">
      <button onClick={() => setIsOpen(!isOpen)}
        className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200">
        <MoreHorizontalIcon className="size-5" />
      </button>
      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)}
        className="absolute right-0 top-full z-20 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900">
        <DropdownItem onClick={() => { setIsOpen(false); onEdit(); }}>
          <PencilIcon className="size-3.5" /> Ubah
        </DropdownItem>
        <DropdownItem onClick={() => { setIsOpen(false); onDelete(); }} className="text-error-600 focus:bg-error-50 focus:text-error-700 dark:text-error-500 dark:focus:bg-error-500/10 dark:focus:text-error-400">
          <TrashBinIcon className="size-3.5" /> Hapus
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

const Majors: React.FC = () => {
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [educationLevelFilter, setEducationLevelFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    setSearchTerm(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  const queryParams = {
    search: searchTerm || undefined,
    educationLevelId: educationLevelFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "ACTIVE",
    page,
    limit,
  };

  const { data: response, isLoading: isDesktopLoading, createMutation, updateMutation, deleteMutation } = useMajors(queryParams);
  const { 
    data: infiniteData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isMobileLoading 
  } = useMajorsInfinite(queryParams);

  const importMutation = useImportMajors();

  const { data: eduLevelsResponse } = useEducationLevels({ limit: 100, isActive: true });
  const eduLevels = useMemo(() => eduLevelsResponse?.data || [], [eduLevelsResponse]);

  const { data: programStudiesResponse } = useProgramStudies({ limit: 200, isActive: true });
  const allProgramStudies = useMemo(() => programStudiesResponse?.data || [], [programStudiesResponse]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MajorFormValues>({
    resolver: zodResolver(majorSchema),
    defaultValues: { code: "", name: "", educationLevelId: 0, programStudyId: 0, isActive: true },
  });

  const selectedEduLevel = watch("educationLevelId");
  const filteredProgramStudies = useMemo(() => {
    if (!selectedEduLevel) return [];
    return allProgramStudies.filter(ps => Number(ps.educationLevelId) === Number(selectedEduLevel));
  }, [selectedEduLevel, allProgramStudies]);

  const items = useMemo(() => {
    if (isMobile) {
      return infiniteData?.pages.flatMap((p) => p.data) || [];
    }
    return response?.data || [];
  }, [isMobile, infiniteData, response]);

  const total = Number(response?.meta?.itemCount ?? response?.meta?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.meta?.totalPages ?? 1);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items;
    return [...items].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA = "";
      let valB = "";
      if (key === "educationLevel.name") {
          valA = a.educationLevel?.name || "";
          valB = b.educationLevel?.name || "";
      } else if (key === "programStudy.name") {
          valA = a.programStudy?.name || "";
          valB = b.programStudy?.name || "";
      } else {
          // @ts-ignore
          valA = String(a[key] || "");
          // @ts-ignore
          valB = String(b[key] || "");
      }
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const allSelected = sortedItems.length > 0 && selectedIds.size === sortedItems.length;
  
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map((i) => i.id)));
    }
  };

  const toggleOne = (id: number | string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleOpenModal = (major?: Major) => {
    if (major) {
      setSelectedMajor(major);
      reset({
        code: major.code,
        name: major.name,
        educationLevelId: major.educationLevelId,
        programStudyId: major.programStudyId || 0,
        isActive: major.isActive,
      });
    } else {
      setSelectedMajor(null);
      reset({ code: "", name: "", educationLevelId: 0, programStudyId: 0, isActive: true });
    }
    setIsModalOpen(true);
  };

  const onSubmitForm = async (data: MajorFormValues) => {
    const confirmed = await confirm({
      variant: selectedMajor ? "update" : "create",
      title: selectedMajor ? "Ubah Jurusan" : "Registrasi Jurusan Baru",
      message: \`Apakah Anda yakin ingin \${selectedMajor ? "mengubah" : "mendaftarkan"} jurusan "\${data.name}"?\`,
    });

    if (!confirmed) return;

    const payload = {
        ...data,
        educationLevelId: Number(data.educationLevelId),
        programStudyId: data.programStudyId ? Number(data.programStudyId) : undefined,
    };

    try {
      if (selectedMajor) {
        await updateMutation.mutateAsync({ id: selectedMajor.id, data: payload as UpdateMajorDto });
        showSuccess(\`Jurusan "\${data.name}" berhasil diubah!\`);
      } else {
        await createMutation.mutateAsync(payload as CreateMajorDto);
        showSuccess(\`Jurusan "\${data.name}" berhasil dibuat!\`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Gagal menyimpan jurusan");
    }
  };

  const handleDelete = async (id: number | string) => {
    const major = items.find(i => i.id === id);
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Jurusan",
      message: \`Apakah Anda yakin ingin menghapus jurusan "\${major?.name || id}"? Tindakan ini tidak dapat dibatalkan.\`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Jurusan berhasil dihapus!");
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
      } catch (error) {
        showError(error, "Gagal menghapus jurusan");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Jurusan Terpilih",
      message: \`Apakah Anda yakin ingin menghapus \${selectedIds.size} jurusan terpilih? Tindakan ini tidak dapat dibatalkan.\`,
    });

    if (confirmed) {
      try {
        for (const id of Array.from(selectedIds)) {
            await deleteMutation.mutateAsync(id);
        }
        showSuccess(\`\${selectedIds.size} jurusan berhasil dihapus!\`);
        setSelectedIds(new Set());
      } catch (error) {
        showError(error, "Gagal menghapus beberapa jurusan");
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await academicService.exportMajorsExcel(queryParams);
      downloadBlob(blob, \`Majors_Export_\${new Date().getTime()}.xlsx\`);
      showSuccess("Data berhasil diekspor ke Excel!");
    } catch (error) {
      showError(error, "Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const blob = await academicService.exportMajorsPdf(queryParams);
      downloadBlob(blob, \`Majors_Export_\${new Date().getTime()}.pdf\`);
      showSuccess("Data berhasil diekspor ke PDF!");
    } catch (error) {
      showError(error, "Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await academicService.downloadMajorsTemplate();
      downloadBlob(blob, "Majors_Template.xlsx");
      showSuccess("Template berhasil diunduh!");
    } catch (error) {
      showError(error, "Gagal mengunduh template");
    }
  };

  const handleResetFilter = () => {
      setSearchQuery("");
      setSearchTerm("");
      setStatusFilter("");
      setEducationLevelFilter("");
      setPage(1);
  };

  const handleApplySearch = () => {
      setSearchTerm(searchQuery);
      setPage(1);
  };

  // Intersection Observer for Infinite Scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobile) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "100px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isMobile, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isLoading = isMobile ? isMobileLoading : isDesktopLoading;

  return (
    <>
      <PageMeta title="Registri Jurusan | Manajemen" description="Kelola jurusan/departemen sekolah." />
      <PageBreadcrumb pageTitle="Jurusan" />

      <div className="space-y-6">
        {/* 2. Page Header - HIDDEN on mobile */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <MajorIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Registri Jurusan</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kelola bidang studi khusus per tingkat pendidikan dan program.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataActionsMenu
              isExporting={isExporting}
              isImporting={importMutation.isPending}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onImportClick={() => setIsImportModalOpen(true)}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
            >
              <PlusIcon className="fill-white size-4" /> Tambah Jurusan
            </button>
          </div>
        </div>

        {/* 3. Mobile FAB */}
        {isMobile && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
            <DataActionsMenu
              isMobileFab={true}
              isExporting={isExporting}
              isImporting={importMutation.isPending}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onImportClick={() => setIsImportModalOpen(true)}
              onDownloadTemplate={handleDownloadTemplate}
            />
            <button
              onClick={() => handleOpenModal()}
              className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
            >
              <PlusIcon className="size-6 fill-white" />
            </button>
          </div>
        )}

        {/* 4. Advanced Filter Card */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-white/[0.05] dark:bg-white/[0.02]">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <FilterIcon className="size-5 text-brand-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Cari & Filter
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gunakan kriteria di bawah ini untuk menyaring data berdasarkan status, tingkat pendidikan, dll.
              </p>
            </div>
            <div className="shrink-0 ml-4">
              <ChevronDownIcon
                className={\`size-5 text-gray-400 transition-transform duration-200 \${
                  isFilterOpen ? "rotate-180" : ""
                }\`}
              />
            </div>
          </button>

          <div
            className={\`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out \${
              isFilterOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }\`}
          >
            <div className="overflow-hidden min-h-0">
              <div className="px-5 pb-5">
                <hr className="mb-5 border-gray-100 dark:border-white/[0.05]" />
                <div className="grid grid-cols-1 gap-5 mb-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                    <CustomSelect
                      value={statusFilter === "all" ? "" : statusFilter}
                      onChange={(val) => {
                        setStatusFilter(val ? String(val) : "all");
                        setPage(1);
                      }}
                      onClear={() => {
                        setStatusFilter("all");
                        setPage(1);
                      }}
                      placeholder="Semua Status"
                      options={[
                        { label: "Aktif", value: "ACTIVE" },
                        { label: "Tidak Aktif", value: "INACTIVE" },
                      ]}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tingkat Pendidikan</Label>
                    <CustomSelect
                      value={educationLevelFilter === "all" ? "" : educationLevelFilter}
                      onChange={(val) => {
                        setEducationLevelFilter(val ? String(val) : "all");
                        setPage(1);
                      }}
                      onClear={() => {
                        setEducationLevelFilter("all");
                        setPage(1);
                      }}
                      placeholder="Semua Tingkat"
                      options={eduLevels.map((edu) => ({ label: edu.name, value: edu.id }))}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 items-end md:grid-cols-3">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Pencarian</Label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleApplySearch();
                        }}
                        placeholder="Cari berdasarkan Kode, Nama..."
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:col-span-1">
                    <button
                      onClick={handleResetFilter}
                      className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300"
                    >
                      Atur Ulang
                    </button>
                    <button
                      onClick={handleApplySearch}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition-all hover:bg-brand-600"
                    >
                      <SearchIcon className="size-4" />
                      Cari
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Toolbar */}
        <TableToolbar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          bulkActions={[
            {
              label: "Hapus Terpilih",
              icon: <TrashBinIcon className="size-3.5" />,
              onClick: handleBulkDelete,
              variant: "danger",
            },
          ]}
        />

        {/* 6. Content */}
        {isMobile ? (
          <div className="space-y-3">
            {sortedItems.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? \`\${selectedIds.size} terpilih\` : "Pilih semua"}
                </span>
              </div>
            )}
            
            {isLoading && items.length === 0 ? (
               <div className="flex items-center justify-center py-10"><div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
            ) : sortedItems.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-10 bg-white dark:bg-white/[0.02] rounded-2xl border border-gray-200 dark:border-white/[0.05]">
                 <MajorIcon className="size-10 text-gray-300 mb-3" />
                 <p className="text-gray-500 text-sm">Tidak ada jurusan yang ditemukan.</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {sortedItems.map((item) => (
                  <MajorCard
                    key={item.id}
                    entity={item}
                    isSelected={selectedIds.has(item.id)}
                    onToggle={() => toggleOne(item.id)}
                    onEdit={() => handleOpenModal(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            )}

            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!hasNextPage && items.length > 0 && (
                <p className="text-xs text-gray-400">Semua data telah dimuat</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl overflow-hidden">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <TableRow>
                  <TableCell isHeader className="w-10 px-4 py-3.5">
                    <Checkbox checked={allSelected} onChange={toggleAll} />
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("code")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      Kode <SortIcon column="code" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      Nama <SortIcon column="name" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("educationLevel.name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      Tingkat <SortIcon column="educationLevel.name" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("programStudy.name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      Program Studi <SortIcon column="programStudy.name" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading ? (
                  <SkeletonTable columns={7} rows={limit} />
                ) : sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                          <MajorIcon className="size-5 opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Tidak ada jurusan yang ditemukan.</p>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                          <PlusIcon className="fill-white size-4 text-brand-500" />
                          Tambah jurusan pertama Anda
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((major) => {
                    const isSelected = selectedIds.has(major.id);
                    return (
                      <TableRow 
                        key={major.id} 
                        className={\`group transition-colors \${
                          isSelected
                            ? "bg-brand-50/60 dark:bg-brand-500/5"
                            : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                        }\`}
                      >
                        <TableCell className="w-10 px-4 py-4">
                          <Checkbox checked={isSelected} onChange={() => toggleOne(major.id)} />
                        </TableCell>
                        <TableCell className="px-5 py-4">
                            <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                                {major.code}
                            </span>
                        </TableCell>
                        <TableCell className="px-5 py-4 font-medium text-gray-900 dark:text-white text-theme-sm">{major.name}</TableCell>
                        <TableCell className="px-5 py-4">
                          <span className="text-theme-sm text-gray-600 dark:text-gray-400">{major.educationLevel?.name || "-"}</span>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <span className="text-theme-sm text-gray-600 dark:text-gray-400">{major.programStudy?.name || "-"}</span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <Badge color={major.isActive ? "success" : "light"}>
                            {major.isActive ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <RowActionMenu onEdit={() => handleOpenModal(major)} onDelete={() => handleDelete(major.id)} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!isMobile && total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> hingga{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> dari{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> data
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                <ChevronLeftIcon className="size-4" />
                Sebelumnya
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
                Selanjutnya
                <AngleRightIcon className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        className="max-w-xl"
        title={selectedMajor ? "Ubah Jurusan" : "Registrasi Jurusan Baru"}
        description="Konfigurasi jurusan bidang studi tertentu dan hubungkan dengan program terkait."
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
                form="major-form"
                className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
              >
                {selectedMajor ? "Simpan Perubahan" : "Buat Jurusan"}
              </button>
           </div>
        }
      >
          <form id="major-form" onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Input
                        label="Kode Jurusan (cth: TKR)"
                        type="text"
                        placeholder="cth: TKR"
                        {...register("code")}
                        error={errors.code?.message}
                    />
                </div>
                <div className="space-y-1.5">
                    <Input
                        label="Nama Jurusan"
                        type="text"
                        placeholder="cth: Teknik Kendaraan Ringan"
                        {...register("name")}
                        error={errors.name?.message}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  name="educationLevelId"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label>Tingkat Pendidikan</Label>
                      <CustomSelect
                          value={field.value || ""}
                          onChange={(val) => {
                            field.onChange(Number(val));
                            setValue("programStudyId", 0);
                          }}
                          options={eduLevels.map(edu => ({ label: edu.name, value: edu.id }))}
                          placeholder="Pilih Tingkat"
                      />
                      {errors.educationLevelId && <p className="text-xs text-error-500">{errors.educationLevelId.message}</p>}
                    </div>
                  )}
                />

                <Controller
                  name="programStudyId"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <Label>Program Studi</Label>
                      <CustomSelect
                          value={field.value || ""}
                          onChange={(val) => field.onChange(Number(val))}
                          options={filteredProgramStudies.map(ps => ({ label: ps.name, value: ps.id }))}
                          placeholder="Pilih Program (Opsional)"
                          disabled={!selectedEduLevel}
                      />
                    </div>
                  )}
                />
            </div>

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                    <Label>Status Jurusan</Label>
                    <div 
                        className={\`flex items-center justify-between rounded-xl border px-4 py-3 transition-all \${
                            field.value 
                            ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10" 
                            : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                        }\`}
                    >
                        <div className="flex flex-col">
                            <span className={\`text-sm font-semibold \${
                                field.value ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                            }\`}>
                                {field.value ? "Jurusan Aktif" : "Jurusan Tidak Aktif"}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-500">
                                {field.value ? "Jurusan tersedia untuk pendaftaran siswa." : "Jurusan saat ini dinonaktifkan."}
                            </span>
                        </div>
                        <Switch 
                            checked={field.value}
                            onChange={(val) => field.onChange(val)}
                        />
                    </div>
                </div>
              )}
            />
          </form>
      </Modal>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(file) => importMutation.mutateAsync(file)}
        onDownloadTemplate={handleDownloadTemplate}
        title="Impor Jurusan"
        description="Unggah file Excel yang berisi daftar jurusan."
      />

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Majors;
"""

with open('/Users/m1pro2021/mhmdiamd/work/pustek/attendance-system/fe-attendance-system-with-cctv/src/pages/Academic/Majors/index.tsx', 'w') as f:
    f.write(content)

