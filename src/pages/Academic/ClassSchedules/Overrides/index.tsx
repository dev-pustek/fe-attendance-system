import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useClassScheduleOverrides, useClassScheduleOverridesInfinite, useClasses } from "../../../../api/hooks/useAcademic";
import { ClassScheduleOverride } from "../../../../api/types/academic";
import PageMeta from "../../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../../components/atoms/Table";
import Modal from "../../../../components/molecules/Modal";
import CustomSelect from "../../../../components/molecules/CustomSelect";
import Dropdown from "../../../../components/molecules/Dropdown";
import DropdownItem from "../../../../components/atoms/DropdownItem";
import DatePicker from "../../../../components/molecules/DatePicker";
import Badge from "../../../../components/atoms/Badge";
import Label from "../../../../components/atoms/Label";
import Checkbox from "../../../../components/atoms/Checkbox";
import Switch from "../../../../components/atoms/Switch";
import TableToolbar from "../../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../../components/molecules/SkeletonRow";
import OverrideCard from "./OverrideCard";
import { useDebounce } from "../../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../../utils/toast";
import ConfirmDialog from "../../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../../hooks/useConfirm";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  AngleRightIcon,
  CalenderIcon,
  FilterIcon,
  SearchIcon,
  XCircleIcon,
  CheckCircleIcon,
} from "../../../../components/atoms/Icons";

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
          <TrashBinIcon className="size-3.5" /> Hapus
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

const overrideSchema = z.object({
  classId: z.number().min(1, "Harap pilih kelas"),
  overrideDate: z.string().min(1, "Tanggal diperlukan"),
  startTime: z.string().nullable().default("07:00"),
  endTime: z.string().nullable().default("15:00"),
  isHoliday: z.boolean().default(false),
  reason: z.string().min(1, "Alasan / Deskripsi diperlukan"),
});

type OverrideFormValues = z.infer<typeof overrideSchema>;

const ClassOverrides: React.FC = () => {
  const isMobile = useIsMobile();

  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [classFilter, setClassFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const { confirm, confirmState } = useConfirm();

  const queryParams = {
    classId: classFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit,
  };

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useClassScheduleOverrides(queryParams);
  const infiniteQuery = useClassScheduleOverridesInfinite({
    classId: classFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: classesResponse } = useClasses({ limit: 100 });
  const classes = classesResponse?.data || [];

  const overrides = response?.data || [];
  const total = Number(response?.meta?.itemCount ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.totalPages ?? Math.ceil(total / limit));

  const infiniteOverrides = infiniteQuery.data?.pages.flatMap((p: any) => p.data ?? []) ?? [];

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
  const [selectedOverride, setSelectedOverride] = useState<ClassScheduleOverride | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClassScheduleOverride; direction: "asc" | "desc" } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      classId: 0,
      overrideDate: new Date().toISOString().split("T")[0],
      startTime: "07:00",
      endTime: "15:00",
      isHoliday: false,
      reason: "",
    },
  });

  const isHoliday = watch("isHoliday");

  useEffect(() => { setSelectedIds(new Set()); }, [page, classFilter, startDate, endDate]);

  const handleSort = (key: keyof ClassScheduleOverride) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedOverrides = [...overrides].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const valA = a[key] || "";
    const valB = b[key] || "";
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof ClassScheduleOverride }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc"
      ? <ChevronUpIcon className="size-3 text-brand-500" />
      : <ChevronDownIcon className="size-3 text-brand-500" />;
  };

  const displayOverrides = isMobile ? infiniteOverrides : sortedOverrides;
  const allSelected = displayOverrides.length > 0 && displayOverrides.every((y: ClassScheduleOverride) => selectedIds.has(y.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayOverrides.map((y: ClassScheduleOverride) => y.id)));
  };
  const toggleOne = (id: number | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleOpenModal = (override?: ClassScheduleOverride) => {
    if (override) {
      setSelectedOverride(override);
      reset({
        classId: Number(override.classId),
        overrideDate: override.overrideDate?.split("T")[0],
        startTime: override.startTime ? override.startTime.substring(0, 5) : "07:00",
        endTime: override.endTime ? override.endTime.substring(0, 5) : "15:00",
        isHoliday: override.isHoliday,
        reason: override.reason,
      });
    } else {
      setSelectedOverride(null);
      reset({
        classId: classes[0]?.id ? Number(classes[0].id) : 0,
        overrideDate: new Date().toISOString().split("T")[0],
        startTime: "07:00",
        endTime: "15:00",
        isHoliday: false,
        reason: "",
      });
    }
    setIsModalOpen(true);
  };

  const onSubmitForm = async (data: OverrideFormValues) => {
    if (!data.classId) {
      showError(null, "Harap pilih kelas");
      return;
    }

    const confirmed = await confirm({
      variant: selectedOverride ? "update" : "create",
      title: selectedOverride ? "Perbarui Pengecualian" : "Tambah Pengecualian",
      message: `Apakah Anda yakin ingin ${selectedOverride ? "memperbarui" : "membuat"} pengecualian jadwal kelas ini?`,
    });
    if (!confirmed) return;

    try {
      const payload = {
        ...data,
        startTime: data.isHoliday ? null : data.startTime,
        endTime: data.isHoliday ? null : data.endTime,
      };

      if (selectedOverride) {
        await updateMutation.mutateAsync({ id: selectedOverride.id, data: payload });
        showSuccess("Pengecualian berhasil diperbarui!");
      } else {
        await createMutation.mutateAsync(payload as any);
        showSuccess("Pengecualian berhasil ditambahkan!");
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Gagal menyimpan pengecualian");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Pengecualian",
      message: "Apakah Anda yakin ingin menghapus pengecualian ini? Jadwal reguler akan berlaku untuk tanggal ini.",
    });
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        showSuccess("Pengecualian berhasil dihapus!");
      } catch (error) {
        showError(error, "Gagal menghapus pengecualian");
      }
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Data Terpilih",
      message: `Hapus ${selectedIds.size} pengecualian? Jadwal reguler akan kembali berlaku.`,
    });
    if (!confirmed) return;
    for (const id of selectedIds) {
      try { await deleteMutation.mutateAsync(id); } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    showSuccess("Pengecualian terpilih berhasil dihapus.");
  };

  return (
    <>
      <PageMeta title="Pengecualian Jadwal | Akademik" description="Kelola pengecualian jadwal kelas khusus." />
      <div className="hidden sm:block">
        <PageBreadcrumb pageTitle="Pengecualian Jadwal" />
      </div>

      <div className="space-y-3 sm:space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengecualian Jadwal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola hari libur, jam kelas khusus, atau acara sekali waktu.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
            >
              <PlusIcon className="fill-white size-4" />
              Tambah Pengecualian
            </button>
          </div>
        </div>

        {/* MOBILE FAB */}
        {isMobile && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
            <button
              onClick={() => handleOpenModal()}
              className="flex size-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
              aria-label="Tambah Pengecualian"
            >
              <PlusIcon className="size-6 fill-white" />
            </button>
          </div>
        )}

        {/* ADVANCED FILTER CARD */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] overflow-hidden">
          <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
              <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                      <FilterIcon className="size-5 text-brand-500" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          Pencarian & Filter
                      </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                      Gunakan kriteria di bawah ini untuk memfilter berdasarkan kelas dan tanggal.
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
                      
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                          <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kelas</Label>
                              <CustomSelect
                                  value={classFilter}
                                  onChange={(val) => { setClassFilter(String(val)); setPage(1); }}
                                  options={[
                                      { label: "Semua Kelas", value: "" },
                                      ...classes.map(c => ({ label: c.name, value: String(c.id) }))
                                  ]}
                                  placeholder="Semua Kelas"
                                  className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                              />
                          </div>
                          <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Mulai</Label>
                              <DatePicker
                                  value={startDate}
                                  onChange={(date) => { setStartDate(date); setPage(1); }}
                                  placeholder="Pilih tanggal mulai"
                              />
                          </div>
                          <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tanggal Akhir</Label>
                              <DatePicker
                                  value={endDate}
                                  onChange={(date) => { setEndDate(date); setPage(1); }}
                                  placeholder="Pilih tanggal akhir"
                              />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        {/* TOOLBAR FOR BULK ACTIONS */}
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

        {/* DATA PRESENTATION */}
        {isMobile ? (
          <div className="space-y-3">
            {infiniteOverrides.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} terpilih` : "Pilih semua"}
                </span>
              </div>
            )}

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
            ) : infiniteOverrides.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                  <CalenderIcon className="size-7 opacity-30" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tidak ada pengecualian jadwal ditemukan</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400"
                >
                  <PlusIcon className="size-3 fill-current" /> Tambah Pengecualian
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {infiniteOverrides.map((ovr: ClassScheduleOverride) => (
                  <OverrideCard
                    key={ovr.id}
                    override={ovr}
                    isSelected={selectedIds.has(ovr.id)}
                    onToggle={() => toggleOne(ovr.id)}
                    onEdit={() => handleOpenModal(ovr)}
                    onDelete={() => handleDelete(ovr.id)}
                  />
                ))}
              </div>
            )}

            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {infiniteQuery.isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!infiniteQuery.hasNextPage && infiniteOverrides.length > 0 && (
                <p className="text-xs text-gray-400">Semua data telah dimuat</p>
              )}
            </div>
          </div>
        ) : (
          /* DESKTOP TABLE */
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                  <TableRow>
                    <TableCell isHeader className="w-10 px-4 py-3.5">
                      <Checkbox checked={allSelected} onChange={toggleAll} />
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button onClick={() => handleSort("overrideDate")} className="flex items-center gap-1.5 hover:text-brand-500 transition-colors">
                        Tanggal <SortIcon column="overrideDate" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button onClick={() => handleSort("classId")} className="flex items-center gap-1.5 hover:text-brand-500 transition-colors">
                        Kelas <SortIcon column="classId" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button onClick={() => handleSort("isHoliday")} className="flex items-center gap-1.5 hover:text-brand-500 transition-colors">
                        Tipe <SortIcon column="isHoliday" />
                      </button>
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jadwal</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alasan</TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isLoading ? (
                    <SkeletonTable cols={6} hasCheckbox rows={limit} />
                  ) : sortedOverrides.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                            <CalenderIcon className="size-7 opacity-30" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tidak ada pengecualian jadwal ditemukan.</p>
                            <p className="mt-0.5 text-xs text-gray-400">Coba sesuaikan filter pencarian atau tambahkan data baru.</p>
                          </div>
                          <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400">
                            <PlusIcon className="size-3 fill-current" /> Tambah Pengecualian
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedOverrides.map((ovr) => {
                      const isRowSelected = selectedIds.has(ovr.id);
                      return (
                        <TableRow key={ovr.id} className={`group transition-colors ${isRowSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"}`}>
                          <TableCell className="w-10 px-4 py-4">
                            <Checkbox checked={isRowSelected} onChange={() => toggleOne(ovr.id)} />
                          </TableCell>
                          <TableCell className="px-5 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <CalenderIcon className="size-4 text-gray-400" />
                            {new Date(ovr.overrideDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                              {ovr.class?.name || ovr.classId}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <Badge color={ovr.isHoliday ? "error" : "primary"}>
                              {ovr.isHoliday ? "Libur" : "Jadwal Khusus"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            {!ovr.isHoliday ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-brand-500">{ovr.startTime?.substring(0, 5)}</span>
                                <span className="text-gray-400 text-xs">-</span>
                                <span className="font-semibold text-brand-500">{ovr.endTime?.substring(0, 5)}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">Tutup</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-4 max-w-xs truncate text-gray-500">
                            {ovr.reason || "Tanpa Alasan"}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            <RowActionMenu onEdit={() => handleOpenModal(ovr)} onDelete={() => handleDelete(ovr.id)} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Desktop */}
            {total > 0 && (
              <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Menampilkan <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> hingga{" "}
                  <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> dari{" "}
                  <span className="font-medium text-gray-700 dark:text-white">{total}</span> pengecualian
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 border rounded-xl disabled:opacity-50 transition-colors hover:bg-gray-50">
                    <ChevronLeftIcon className="size-4" />
                  </button>
                  <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 border rounded-xl disabled:opacity-50 transition-colors hover:bg-gray-50">
                    <AngleRightIcon className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* FORM MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-md"
        title={selectedOverride ? "Perbarui Pengecualian Jadwal" : "Tambah Pengecualian Jadwal"}
        description="Atur pengecualian untuk tanggal dan kelas tertentu."
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" form="override-form" className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20">
              {selectedOverride ? "Perbarui" : "Simpan"}
            </button>
          </div>
        }
      >
        <form id="override-form" onSubmit={handleSubmit(onSubmitForm)} className="space-y-4 p-1">
          <Controller
            name="classId"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <CustomSelect
                  label="Kelas"
                  value={field.value}
                  onChange={(val) => field.onChange(Number(val))}
                  options={classes.map((c) => ({ label: c.name, value: Number(c.id) }))}
                  placeholder="Pilih Kelas"
                />
                {errors.classId && <p className="text-xs text-error-500">{errors.classId.message}</p>}
              </div>
            )}
          />

          <Controller
            name="overrideDate"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <DatePicker
                  label="Tanggal Pengecualian"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pilih tanggal"
                />
                {errors.overrideDate && <p className="text-xs text-error-500">{errors.overrideDate.message}</p>}
              </div>
            )}
          />

          <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${isHoliday ? "opacity-50" : ""}`}>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Waktu Mulai</Label>
              <input
                type="time"
                {...register("startTime")}
                disabled={isHoliday}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-white/[0.01]"
              />
              {errors.startTime && !isHoliday && <p className="text-xs text-error-500">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Waktu Selesai</Label>
              <input
                type="time"
                {...register("endTime")}
                disabled={isHoliday}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-white/[0.01]"
              />
              {errors.endTime && !isHoliday && <p className="text-xs text-error-500">{errors.endTime.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Alasan / Deskripsi</Label>
            <textarea
              {...register("reason")}
              placeholder="Misal: Ulang Tahun Sekolah, Ujian Tengah Semester, Libur Nasional..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white min-h-[80px] resize-none"
            />
            {errors.reason && <p className="text-xs text-error-500">{errors.reason.message}</p>}
          </div>

          <div
            className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-all cursor-pointer hover:border-brand-200 dark:hover:border-brand-500/30 ${
              isHoliday
                ? "border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/5"
                : "border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]"
            }`}
            onClick={() => setValue("isHoliday", !isHoliday, { shouldValidate: true })}
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Libur / Tidak Ada Kelas</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isHoliday
                  ? "Kelas dibatalkan. Kehadiran tidak akan dilacak untuk hari ini."
                  : "Kelas akan berjalan sesuai dengan jadwal khusus yang diatur di atas."}
              </p>
            </div>
            <div className="mt-0.5 pointer-events-none">
              <Switch checked={isHoliday} onChange={() => {}} />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default ClassOverrides;
