import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useSubjects, useSubjectsInfinite, useMajors } from "../../../api/hooks/useAcademic";
import { Subject, CreateSubjectDto, UpdateSubjectDto } from "../../../api/types/academic";

import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";

import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import Switch from "../../../components/atoms/Switch";

import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../utils/toast";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";

import SubjectCard from "./SubjectCard";
import { useDebounce } from "../../../hooks/useDebounce";
import { useInView } from "react-intersection-observer";

import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  ChevronLeftIcon,
  AngleRightIcon,
  FilterIcon,
  SearchIcon,
  ChevronDownIcon,
  InfoIcon as SubjectIcon,
  HorizontaLDots as MoreHorizontalIcon,
} from "../../../components/atoms/Icons";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";

const subjectSchema = z.object({
  code: z.string().min(1, "Kode Mata Pelajaran wajib diisi"),
  name: z.string().min(1, "Nama Mata Pelajaran wajib diisi"),
  majorId: z.coerce.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}



export default function Subjects() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { confirm, confirmState } = useConfirm();
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const { ref: sentinelRef, inView } = useInView();

  const majorFilter = searchParams.get("majorId") || "all";
  const statusFilter = searchParams.get("status") || "all";

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "all" || value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
    setPage(1);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const queryParams = useMemo(() => ({
    search: searchTerm || undefined,
    majorId: majorFilter === "all" ? undefined : majorFilter,
    isActive: statusFilter === "all" ? undefined : statusFilter === "true",
  }), [searchTerm, majorFilter, statusFilter]);

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useSubjects({
    ...queryParams,
    page,
    limit,
  });

  const { data: infiniteResponse, fetchNextPage, hasNextPage, isFetchingNextPage } = useSubjectsInfinite(queryParams);
  const { data: majorsResponse } = useMajors({ limit: 100, isActive: true });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const majors = useMemo(() => majorsResponse?.data || [], [majorsResponse]);
  const desktopSubjects = useMemo(() => response?.data || [], [response]);
  const infiniteSubjects = useMemo(() => infiniteResponse?.pages.flatMap((p) => p.data) || [], [infiniteResponse]);

  const subjects = isMobile ? infiniteSubjects : desktopSubjects;
  const total = Number(response?.meta?.itemCount ?? response?.meta?.total ?? 0);
  const totalPages = Number(response?.meta?.pageCount ?? response?.meta?.totalPages ?? 1);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, searchTerm, majorFilter, statusFilter, isMobile]);

  const { register, handleSubmit: hookFormSubmit, control, reset, formState: { errors } } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { code: "", name: "", isActive: true, majorId: null },
  });

  const handleOpenModal = (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      reset({
        code: subject.code,
        name: subject.name,
        majorId: subject.majorId ? Number(subject.majorId) : null,
        isActive: subject.isActive,
      });
    } else {
      setSelectedSubject(null);
      reset({ code: "", name: "", isActive: true, majorId: null });
    }
    setIsModalOpen(true);
  };

  const onSubmitForm = async (data: SubjectFormValues) => {
    const payload = {
      ...data,
      majorId: data.majorId || null,
    };

    try {
      if (selectedSubject) {
        await updateMutation.mutateAsync({ id: selectedSubject.id, data: payload as UpdateSubjectDto });
        showSuccess(`Mata Pelajaran "${data.name}" berhasil diperbarui`);
      } else {
        await createMutation.mutateAsync(payload as CreateSubjectDto);
        showSuccess(`Mata Pelajaran "${data.name}" berhasil dibuat`);
      }
      setIsModalOpen(false);
    } catch (e) {
      showError(e, "Gagal menyimpan mata pelajaran");
    }
  };

  const handleDelete = async (subject: Subject) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Mata Pelajaran",
      message: `Apakah Anda yakin ingin menghapus "${subject.name}"? Tindakan ini tidak dapat dibatalkan.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(subject.id);
        showSuccess("Mata Pelajaran berhasil dihapus.");
      } catch (e) {
        showError(e, "Gagal menghapus mata pelajaran");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Massal Mata Pelajaran",
      message: `Apakah Anda yakin ingin menghapus permanen ${selectedIds.size} mata pelajaran terpilih?`,
      confirmText: `Hapus ${selectedIds.size} Mata Pelajaran`,
    });

    if (confirmed) {
      try {
        const promises = Array.from(selectedIds).map((id) => deleteMutation.mutateAsync(id));
        await Promise.all(promises);
        showSuccess(`Berhasil menghapus ${selectedIds.size} mata pelajaran.`);
        setSelectedIds(new Set());
      } catch (e) {
        showError(e, "Gagal menghapus beberapa mata pelajaran");
      }
    }
  };

  const allSelected = subjects.length > 0 && subjects.every((s) => selectedIds.has(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(subjects.map((s) => s.id)));
    }
  };

  const toggleOne = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <PageMeta title="Mata Pelajaran | Manajemen" description="Kelola mata pelajaran sekolah." />
      <PageBreadcrumb pageTitle="Mata Pelajaran" />

      <div className="space-y-6">
        {/* Header Section */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <SubjectIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Registri Mata Pelajaran</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kelola mata pelajaran akademik dan hubungkan dengan jurusan.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataActionsMenu />
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
            >
              <PlusIcon className="fill-white size-4" /> Tambah Mata Pelajaran
            </button>
          </div>
        </div>

        {/* Mobile FABs */}
        {isMobile && (
          <MobileFloatingActions
            onAdd={() => handleOpenModal()}
            addAriaLabel="Tambah Mata Pelajaran"
            dataActionsProps={{}}
          />
        )}

        {/* Advanced Filter Card */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-white/[0.05] dark:bg-white/[0.02]">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors dark:hover:bg-white/[0.02]"
          >
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <FilterIcon className="size-5 text-brand-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Cari & Filter
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gunakan kriteria di bawah ini untuk menyaring data berdasarkan jurusan atau status.
              </p>
            </div>
            <div className="shrink-0 ml-4">
              <ChevronDownIcon
                className={`size-5 text-gray-400 transition-transform duration-200 ${
                  isFilterOpen ? "rotate-180" : ""
                }`}
              />
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

                <div className="grid grid-cols-1 gap-5 items-end lg:grid-cols-12">
                  <div className="space-y-1.5 lg:col-span-3">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Jurusan Terkait</Label>
                    <CustomSelect
                      value={majorFilter === "all" ? "" : Number(majorFilter)}
                      onChange={(val) => updateFilter("majorId", val ? String(val) : "all")}
                      onClear={() => updateFilter("majorId", "all")}
                      placeholder="Semua Jurusan (Termasuk Umum)"
                      options={[
                        ...majors.map((m: any) => ({ label: m.name, value: Number(m.id) })),
                      ]}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-3">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                    <CustomSelect
                      value={statusFilter === "all" ? "" : statusFilter}
                      onChange={(val) => updateFilter("status", val ? String(val) : "all")}
                      onClear={() => updateFilter("status", "all")}
                      placeholder="Semua Status"
                      options={[
                        { label: "Aktif", value: "true" },
                        { label: "Tidak Aktif", value: "false" },
                      ]}
                      className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5 lg:col-span-4">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cari Mata Pelajaran</Label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSearchTerm(searchQuery);
                            setPage(1);
                          }
                        }}
                        placeholder="Cari berdasarkan Kode atau Nama..."
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 lg:col-span-2">
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchTerm("");
                        setSearchParams(new URLSearchParams());
                        setPage(1);
                      }}
                      className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300"
                    >
                      Atur Ulang
                    </button>
                    <button
                      onClick={() => {
                        setSearchTerm(searchQuery);
                        setPage(1);
                      }}
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

        {/* Toolbar (Bulk Actions ONLY) */}
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

        {/* Content Section */}
        {isMobile ? (
          <div className="space-y-3">
            {subjects.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} terpilih` : "Pilih semua"}
                </span>
              </div>
            )}

            {isLoading && subjects.length === 0 ? (
              <div className="py-20 flex justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="py-20 text-center text-gray-400 border rounded-2xl bg-white dark:bg-white/[0.02] dark:border-white/[0.05]">
                <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <SubjectIcon className="size-5 opacity-20" />
                </div>
                <p className="text-sm font-medium">Tidak ada mata pelajaran yang ditemukan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {subjects.map((item: Subject) => (
                  <SubjectCard
                    key={item.id}
                    subject={item}
                    isSelected={selectedIds.has(item.id)}
                    onSelect={() => toggleOne(item.id)}
                    onEdit={() => handleOpenModal(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </div>
            )}

            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!hasNextPage && subjects.length > 0 && (
                <p className="text-xs text-gray-400 font-medium">Semua mata pelajaran telah dimuat</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="w-10 px-4 py-3.5">
                    <Checkbox checked={allSelected} onChange={toggleAll} />
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kode
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nama
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Jurusan
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
                {isLoading && subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                        <span className="text-sm">Memuat mata pelajaran...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                          <SubjectIcon className="size-5 opacity-20" />
                        </div>
                        <p className="text-sm font-medium">Tidak ada mata pelajaran yang ditemukan.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map((subject: Subject) => (
                    <TableRow
                      key={subject.id}
                      className={`group transition-colors ${
                        selectedIds.has(subject.id)
                          ? "bg-brand-50/60 dark:bg-brand-500/5"
                          : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                      }`}
                    >
                      <TableCell className="w-10 px-4 py-4">
                        <Checkbox checked={selectedIds.has(subject.id)} onChange={() => toggleOne(subject.id)} />
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
                          {subject.code}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-4 font-medium text-gray-900 dark:text-white text-theme-sm">
                        {subject.name}
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        {subject.major ? (
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-brand-500" />
                            <span className="text-theme-sm text-gray-600 dark:text-gray-400">{subject.major.name}</span>
                          </div>
                        ) : (
                          <span className="text-theme-xs text-gray-400 italic">Mata Pelajaran Umum (Semua Jurusan)</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <Badge color={subject.isActive ? "success" : "light"}>
                          {subject.isActive ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleOpenModal(subject)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                            title="Ubah Mata Pelajaran"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(subject)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                            title="Hapus Mata Pelajaran"
                          >
                            <TrashBinIcon className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Menampilkan{" "}
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
                  </span>{" "}
                  dari <span className="font-semibold text-gray-600 dark:text-gray-300">{total}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
                    <ChevronLeftIcon className="size-3.5" /> Sebelumnya
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-xl"
        title={selectedSubject ? "Ubah Mata Pelajaran" : "Daftarkan Mata Pelajaran Baru"}
        description="Atur mata pelajaran dan kaitkan dengan jurusan jika diperlukan."
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
              form="subject-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedSubject ? "Perbarui" : "Buat"}
            </button>
          </div>
        }
      >
        <form id="subject-form" onSubmit={hookFormSubmit(onSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kode Mata Pelajaran</Label>
              <Input
                type="text"
                {...register("code")}
                placeholder="cth. MTK-10"
                error={errors.code?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Mata Pelajaran</Label>
              <Input
                type="text"
                {...register("name")}
                placeholder="cth. Matematika Kelas 10"
                error={errors.name?.message}
              />
            </div>
          </div>

          <Controller
            name="majorId"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <CustomSelect
                  label="Jurusan Terkait (Opsional)"
                  value={field.value || ""}
                  onChange={(val) => field.onChange(val ? Number(val) : null)}
                  options={[
                    { label: "Mata Pelajaran Umum (Semua Jurusan)", value: "" },
                    ...majors.map((m: any) => ({ label: m.name, value: m.id })),
                  ]}
                  placeholder="Pilih Jurusan"
                  onClear={() => field.onChange(null)}
                />
                {errors.majorId && <p className="text-xs text-error-500">{errors.majorId.message}</p>}
              </div>
            )}
          />

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status Mata Pelajaran</Label>
                <div
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                    field.value
                      ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/10"
                      : "border-gray-200 bg-gray-50/50 dark:border-white/[0.08] dark:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex flex-col">
                    <span
                      className={`text-sm font-semibold ${
                        field.value ? "text-green-700 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {field.value ? "Mata Pelajaran Aktif" : "Mata Pelajaran Tidak Aktif"}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-500">
                      {field.value ? "Mata pelajaran tersedia untuk penjadwalan." : "Mata pelajaran sedang dinonaktifkan."}
                    </span>
                  </div>
                  <Switch checked={field.value} onChange={field.onChange} />
                </div>
              </div>
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
}
