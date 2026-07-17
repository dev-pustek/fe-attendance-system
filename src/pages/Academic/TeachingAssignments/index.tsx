import React, { useState, useMemo, useCallback } from "react";
import { 
  useTeachingAssignments, 
  useClassSubjects 
} from "../../../api/hooks/useAcademic";
import { 
  TeachingAssignment, 
  CreateTeachingAssignmentDto, 
  UpdateTeachingAssignmentDto
} from "../../../api/types/academic";
import { profilesService } from "../../../api/services/profilesService";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import { 
  PencilIcon, 
  TrashBinIcon, 
  PlusIcon, 
  GridIcon, 
  ChevronLeftIcon, 
  AngleRightIcon, 
  BoxIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  UserIcon,
  CheckCircleIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";
import Label from "../../../components/atoms/Label";

const TeachingAssignments: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classSubjectIdFilter, setClassSubjectIdFilter] = useState("");
  const [teacherIdFilter, setTeacherIdFilter] = useState("");
  
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useTeachingAssignments({
    search: debouncedSearch || undefined,
    classSubjectId: classSubjectIdFilter || undefined,
    teacherId: teacherIdFilter || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    page,
    limit,
  });

  const { data: classSubjectsRes } = useClassSubjects({ limit: 100 });

  const classSubjectOptions = (classSubjectsRes?.data || []).map(cs => ({
    label: `${cs.class?.name} - ${cs.subject?.name}`,
    value: cs.id
  }));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TeachingAssignment | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<CreateTeachingAssignmentDto>({
    classSubjectId: "",
    teacherId: "",
    role: "primary",
    isActive: true,
  });
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

  const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const searchTeachers = useCallback(async (term: string) => {
    setIsSearchingTeachers(true);
    try {
      const employees = await profilesService.getEmployees({
        search: term,
        limit: 10,
      });
      setTeacherOptions(
        employees.data.map((e) => ({
          label: e.user?.name || "Tidak Diketahui",
          value: e.user?.public_id || "",
          subLabel: e.user?.email,
        }))
      );
    } catch (error) {
      console.error("Failed to search teachers", error);
    } finally {
      setIsSearchingTeachers(false);
    }
  }, []);

  const [isSearchingTeachersFilter, setIsSearchingTeachersFilter] = useState(false);
  const [teacherOptionsFilter, setTeacherOptionsFilter] = useState<{ label: string; value: string; subLabel?: string }[]>([]);

  const searchTeachersFilter = useCallback(async (term: string) => {
    setIsSearchingTeachersFilter(true);
    try {
      const employees = await profilesService.getEmployees({
        search: term,
        limit: 10,
      });
      setTeacherOptionsFilter(
        employees.data.map((e) => ({
          label: e.user?.name || "Tidak Diketahui",
          value: e.user?.public_id || "",
          subLabel: e.user?.email,
        }))
      );
    } catch (error) {
      console.error("Failed to search teachers", error);
    } finally {
      setIsSearchingTeachersFilter(false);
    }
  }, []);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const assignments = useMemo(() => {
    return response?.data || [];
  }, [response]);
  
  const sortedAssignments = useMemo(() => {
    if (!sortConfig) return assignments;
    return [...assignments].sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number = "";
      let valB: string | number = "";

      if (key === "teacher") {
        valA = a.teacher?.name || "";
        valB = b.teacher?.name || "";
      } else if (key === "class") {
        valA = a.classSubject?.class?.name || "";
        valB = b.classSubject?.class?.name || "";
      } else if (key === "subject") {
        valA = a.classSubject?.subject?.name || "";
        valB = b.classSubject?.subject?.name || "";
      } else {
        valA = String((a as Record<string, any>)[key] ?? "");
        valB = String((b as Record<string, any>)[key] ?? "");
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [assignments, sortConfig]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = response?.meta?.itemCount || 0;
  const totalPages = response?.meta?.pageCount || 1;

  const handleOpenModal = (assignment?: TeachingAssignment) => {
    if (assignment) {
      setSelectedAssignment(assignment);
      setFormData({
        classSubjectId: assignment.classSubjectId,
        teacherId: assignment.teacherId,
        role: assignment.role,
        isActive: assignment.isActive,
      });
      // Pre-populate teacher options for edit
      if (assignment.teacher) {
        setTeacherOptions([{
          label: assignment.teacher.name || "Tidak Diketahui",
          value: assignment.teacher.public_id || "",
          subLabel: assignment.teacher.email
        }]);
      }
    } else {
      setSelectedAssignment(null);
      setFormData({
        classSubjectId: "",
        teacherId: "",
        role: "primary",
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.classSubjectId || !formData.teacherId || !formData.role) {
        showError("Harap isi semua kolom yang wajib diisi");
        return;
    }

    const confirmed = await confirm({
      variant: selectedAssignment ? 'update' : 'create',
      title: selectedAssignment ? 'Perbarui Penugasan' : 'Buat Penugasan',
      message: `Apakah Anda yakin ingin ${selectedAssignment ? 'memperbarui' : 'membuat'} penugasan mengajar ini?`,
    });

    if (!confirmed) return;

    try {
      if (selectedAssignment) {
        await updateMutation.mutateAsync({
          id: selectedAssignment.id,
          data: formData as UpdateTeachingAssignmentDto
        });
        showSuccess(`Penugasan berhasil diperbarui!`);
      } else {
        await createMutation.mutateAsync(formData);
        showSuccess(`Penugasan berhasil dibuat!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Gagal menyimpan penugasan");
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Hapus Penugasan',
      message: 'Apakah Anda yakin ingin menghapus penugasan mengajar ini? Tindakan ini tidak dapat dibatalkan.',
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        showSuccess("Penugasan berhasil dihapus!");
      } catch (error) {
        showError(error, "Gagal menghapus penugasan");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedAssignments.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number | string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Hapus Penugasan Massal',
      message: `Apakah Anda yakin ingin menghapus permanen ${count} penugasan mengajar yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: `Hapus ${count} Penugasan`
    });

    if (confirmed) {
      try {
        const promises = selectedIds.map(id => deleteMutation.mutateAsync(id));
        await Promise.all(promises);
        showSuccess(`Berhasil menghapus ${count} penugasan.`);
        setSelectedIds([]);
      } catch (error) {
        showError(error, "Gagal menghapus beberapa penugasan");
      }
    }
  };

  return (
    <>
      <PageMeta title="Penugasan Mengajar | SIAPUS" description="Kelola guru yang ditugaskan mengajar mata pelajaran di kelas tertentu." />
      <PageBreadcrumb pageTitle="Penugasan Mengajar" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Penugasan Mengajar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Tetapkan guru sebagai Utama atau Pendamping untuk mata pelajaran kelas tertentu.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          >
            <PlusIcon className="size-4 fill-current" />
            Tugaskan Guru
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-white dark:bg-white/[0.03] p-5 rounded-2xl border border-gray-100 dark:border-white/[0.05]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cari</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <GridIcon className="size-4" />
                </div>
                <input
                  type="text"
                  placeholder="Nama guru atau kelas..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <CustomSelect
              label="Mata Pelajaran Kelas"
              placeholder="Semua Mata Pelajaran Kelas"
              value={classSubjectIdFilter}
              onChange={(val: string | number) => { setClassSubjectIdFilter(String(val)); setPage(1); }}
              options={[{ label: "Semua Mata Pelajaran Kelas", value: "" }, ...classSubjectOptions]}
            />

            <SearchableAsyncSelect
                label="Filter Guru"
                placeholder="Cari guru..."
                value={teacherIdFilter}
                onChange={(val) => { setTeacherIdFilter(String(val)); setPage(1); }}
                onSearch={searchTeachersFilter}
                options={[{ label: "Semua Guru", value: "" }, ...teacherOptionsFilter]}
                isLoading={isSearchingTeachersFilter}
            />

            <CustomSelect
              label="Peran"
              placeholder="Semua Peran"
              value={roleFilter}
              onChange={(val: string | number) => { setRoleFilter(String(val)); setPage(1); }}
              options={[
                { label: "Semua Peran", value: "" },
                { label: "Utama", value: "primary" },
                { label: "Pendamping", value: "assistant" },
              ]}
            />

            <CustomSelect
              label="Status"
              value={statusFilter}
              onChange={(val: string | number) => { setStatusFilter(String(val)); setPage(1); }}
              options={[
                { label: "Semua Status", value: "" },
                { label: "Aktif", value: "true" },
                { label: "Tidak Aktif", value: "false" },
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 w-12">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={sortedAssignments.length > 0 && selectedIds.length === sortedAssignments.length}
                        onChange={handleSelectAll}
                    />
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("teacher")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Guru <SortIcon column={"teacher"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-left">
                  <button onClick={() => handleSort("class")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Kelas & Mata Pelajaran <SortIcon column={"class"} />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Peran</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Memuat penugasan...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <UserIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">Belum ada penugasan mengajar.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="size-3" />
                        Tugaskan guru pertama Anda
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAssignments.map((assignment: TeachingAssignment) => (
                  <TableRow key={assignment.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={selectedIds.includes(assignment.id)}
                            onChange={() => handleSelectRow(assignment.id)}
                        />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                          {assignment.teacher?.photo ? (
                            <img src={assignment.teacher.photo} alt={assignment.teacher.name} className="size-full object-cover" />
                          ) : (
                            <UserIcon className="size-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{assignment.teacher?.name || "Guru Tidak Diketahui"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 lowercase">{assignment.teacher?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium text-theme-sm">
                           <GridIcon className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
                           {assignment.classSubject?.class?.name}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                           <BoxIcon className="size-3.5 opacity-50" />
                           {assignment.classSubject?.subject?.name}
                           <span className="text-[10px] ml-1 opacity-50 uppercase">{assignment.classSubject?.subject?.code}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge color={assignment.role === "primary" ? "primary" : "light"}>
                          {assignment.role === "primary" ? "Utama" : "Pendamping"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge color={assignment.isActive ? "success" : "error"}>
                        {assignment.isActive ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(assignment)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(assignment.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
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
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
               Menampilkan <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> sampai{" "}
               <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> dari{" "}
               <span className="font-medium text-gray-700 dark:text-white">{total}</span> penugasan
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
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
        title={selectedAssignment ? "Perbarui Penugasan Mengajar" : "Tugaskan Guru ke Mata Pelajaran Kelas"}
        description="Atur guru yang bertanggung jawab atas mata pelajaran ini di kelas tertentu."
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
              form="teaching-assignment-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedAssignment ? "Perbarui Penugasan" : "Tugaskan Guru"}
            </button>
          </div>
        }
      >
          <form id="teaching-assignment-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
                <CustomSelect
                    label="Mata Pelajaran Kelas"
                    placeholder="Pilih mata pelajaran kelas..."
                    value={formData.classSubjectId}
                    onChange={(val) => setFormData({ ...formData, classSubjectId: val })}
                    options={classSubjectOptions}
                />

                <SearchableAsyncSelect
                    label="Guru"
                    placeholder="Cari guru berdasarkan nama atau email..."
                    value={formData.teacherId}
                    onChange={(val) => setFormData({ ...formData, teacherId: String(val) })}
                    onSearch={searchTeachers}
                    options={teacherOptions}
                    isLoading={isSearchingTeachers}
                />

                <div className="space-y-2">
                  <Label>Peran Penugasan</Label>
                  <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, role: "primary" })}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                          formData.role === "primary"
                            ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                            : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 dark:border-white/5 dark:bg-white/[0.02] dark:text-gray-400"
                        }`}
                      >
                        <CheckCircleIcon className="size-4" />
                        <span className="text-sm font-medium">Utama</span>
                      </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: "assistant" })}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                        formData.role === "assistant"
                          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                          : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 dark:border-white/5 dark:bg-white/[0.02] dark:text-gray-400"
                      }`}
                    >
                      <UserIcon className="size-4" />
                      <span className="text-sm font-medium">Pendamping</span>
                    </button>
                  </div>
                </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-gray-900 dark:text-white">Status Aktif</Label>
                <p className="text-xs text-gray-500">Aktifkan atau nonaktifkan penugasan ini.</p>
              </div>
              <Switch
                checked={formData.isActive || false}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default TeachingAssignments;
