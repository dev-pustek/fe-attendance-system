import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEmployees, useEmployeesInfinite, useImportEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "../../../api/hooks/useProfiles";
import { useResetPassword } from "../../../api/hooks/useUsers";
import { EmployeeProfile } from "../../../api/types/profiles";
import { useAppMenu } from "../../../hooks/useAppMenu";
import { profilesService } from "../../../api/services/profilesService";
import { accessControlService } from "../../../api/services/accessControlService";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import Modal from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import ImportModal from "../../../components/molecules/ImportModal";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  AngleRightIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  UserCircleIcon,
  GridIcon,
  DocsIcon,
  FilterIcon,
  SearchIcon,
} from "../../../components/atoms/Icons";
import DatePicker from "../../../components/molecules/DatePicker";
import Badge from "../../../components/atoms/Badge";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Switch from "../../../components/atoms/Switch";
import NumberInput from "../../../components/atoms/NumberInput";
import PhoneNumberInput from "../../../components/atoms/PhoneNumberInput";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";
import EmployeeCard from "./EmployeeCard";
import { useDebounce } from "../../../hooks/useDebounce";
import { showSuccess, showError } from "../../../utils/toast";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { useNavigate } from "react-router";
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

const MoreHorizontalIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z" />
  </svg>
);

const RowActionMenu = ({ 
  onEdit, 
  onDelete, 
  onAcademic, 
  onResetPassword,
  showResetPassword = false
}: { 
  onEdit: () => void; 
  onDelete: () => void; 
  onAcademic: () => void; 
  onResetPassword?: () => void;
  showResetPassword?: boolean;
}) => {
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
        className="absolute right-0 top-full z-20 mt-1 w-40 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900"
      >
        <DropdownItem
          onClick={() => {
            setIsOpen(false);
            onAcademic();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          <DocsIcon className="size-3.5" /> Profil Akademik
        </DropdownItem>
        <DropdownItem
          onClick={() => {
            setIsOpen(false);
            onEdit();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          <PencilIcon className="size-3.5" /> Edit
        </DropdownItem>
        {showResetPassword && onResetPassword && (
          <DropdownItem
            onClick={() => {
              setIsOpen(false);
              onResetPassword();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            <UserCircleIcon className="size-3.5" /> Reset Kata Sandi
          </DropdownItem>
        )}
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

// ─── Zod Schema for Form ────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const employeeSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  employeeId: z.string().min(1, "ID Pegawai wajib diisi"),
  nip: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  hireDate: z.string().optional(),
  employmentStatus: z.string().optional(),
  nik: z.string().optional(),
  placeOfBirth: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  rt: z.string().optional(),
  rw: z.string().optional(),
  kelurahan: z.string().optional(),
  kecamatan: z.string().optional(),
  province: z.string().optional(),
  notes: z.string().optional(),
  isTeacher: z.boolean().default(false).optional(),
  photo: z.any()
    .refine((file) => !file || file?.size <= MAX_FILE_SIZE, `Ukuran file maksimal 5MB.`)
    .refine(
      (file) => !file || (typeof file === "string") || ACCEPTED_IMAGE_TYPES.includes(file?.type),
      "Hanya format .jpg, .jpeg, .png, dan .webp yang didukung."
    ).optional(),
});
type EmployeeFormValues = z.infer<typeof employeeSchema>;

const EmployeesList: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // ── Desktop pagination state ─────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(() => window.innerWidth >= 640);
  const { confirm, confirmState } = useConfirm();

  // ── Desktop query ─────────────────────────────────────────────────────────
  const queryParams = {
    search: searchTerm || undefined,
    department: departmentFilter === "" ? undefined : departmentFilter,
    employmentStatus: statusFilter === "" ? undefined : statusFilter,
    page,
    limit,
  };
  const { data: response, isLoading } = useEmployees(queryParams);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const resetPasswordMutation = useResetPassword();
  
  const { isAdmin, isSuperAdmin } = useAppMenu();
  const showResetPassword = isAdmin || isSuperAdmin;

  // ── Mobile infinite query ─────────────────────────────────────────────────
  const infiniteQuery = useEmployeesInfinite({
    search: searchTerm || undefined,
    department: departmentFilter === "" ? undefined : departmentFilter,
    employmentStatus: statusFilter === "" ? undefined : statusFilter,
  });

  // ── Import mutation ───────────────────────────────────────────────────────
  const importMutation = useImportEmployees();

  const employees = response?.data || [];
  const total = Number(response?.meta?.total ?? response?.total ?? 0);
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  // Mobile infinite cards
  const infiniteEmployees = infiniteQuery.data?.pages.flatMap((p: any) => p.data ?? []) ?? [];

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
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "", email: "", phone: "", isActive: true, employeeId: "", nip: "",
      department: "", position: "", employmentStatus: "PERMANENT", hireDate: "",
      nik: "", placeOfBirth: "", dateOfBirth: "", gender: "M", religion: "",
      address: "", rt: "", rw: "", kelurahan: "", kecamatan: "", province: "",
      notes: "", isTeacher: false, photo: null
    },
  });

  const watchIsActive = watch("isActive");
  const watchIsTeacher = watch("isTeacher");

  // Clear selection on filter changes
  useEffect(() => { setSelectedIds(new Set()); }, [page, searchTerm, departmentFilter, statusFilter, isMobile]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedEmployees = [...employees].sort((a: any, b: any) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA = a[key] || "";
    let valB = b[key] || "";
    if (key === 'name') {
        valA = a.user?.name || "";
        valB = b.user?.name || "";
    }
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column)
      return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc"
      ? <ChevronUpIcon className="size-3 text-brand-500" />
      : <ChevronDownIcon className="size-3 text-brand-500" />;
  };

  // ── Selection helpers ─────────────────────────────────────────────────────
  const displayEmployees = isMobile ? infiniteEmployees : sortedEmployees;
  const allSelected = displayEmployees.length > 0 && displayEmployees.every((e: EmployeeProfile) => selectedIds.has(e.userId));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayEmployees.map((e: EmployeeProfile) => e.userId)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Modal ────────────────────────────────────────────────────────────────
  const handleOpenModal = (employee?: EmployeeProfile) => {
    if (employee) {
      setSelectedEmployee(employee);
      setPreviewPhoto(employee.user?.photo || null);
      reset({
        name: employee.user?.name || "",
        email: employee.user?.email || "",
        phone: employee.user?.phone || "",
        isActive: employee.user?.isActive ?? true,
        employeeId: employee.employeeId,
        nip: employee.nip || "",
        department: employee.department || "",
        position: employee.position || "",
        employmentStatus: employee.employmentStatus || "PERMANENT",
        hireDate: employee.hireDate?.split('T')[0] || "",
        nik: employee.nik || "",
        placeOfBirth: employee.placeOfBirth || "",
        dateOfBirth: employee.dateOfBirth?.split('T')[0] || "",
        gender: employee.gender || "M",
        religion: employee.religion || "",
        address: employee.address || "",
        rt: employee.rt || "",
        rw: employee.rw || "",
        kelurahan: employee.kelurahan || "",
        kecamatan: employee.kecamatan || "",
        province: employee.province || "",
        notes: employee.notes || "",
        isTeacher: false, // You cannot un-teacher once created easily via this basic form, typically. We leave it false.
        photo: null,
      });
    } else {
      setSelectedEmployee(null);
      setPreviewPhoto(null);
      reset({ 
        name: "", email: "", phone: "", isActive: true, employeeId: "", nip: "",
        department: "", position: "", employmentStatus: "PERMANENT", hireDate: "",
        nik: "", placeOfBirth: "", dateOfBirth: "", gender: "M", religion: "",
        address: "", rt: "", rw: "", kelurahan: "", kecamatan: "", province: "",
        notes: "", isTeacher: false, photo: null 
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setValue("photo", file, { shouldValidate: true });
        setPreviewPhoto(URL.createObjectURL(file));
    }
  };

  const onSubmitForm = async (data: EmployeeFormValues) => {
    const confirmed = await confirm({
      variant: selectedEmployee ? "update" : "create",
      title: selectedEmployee ? "Ubah Pegawai" : "Tambah Pegawai",
      message: `Apakah Anda yakin ingin ${selectedEmployee ? "mengubah" : "menambahkan"} data pegawai "${data.name}"?`,
    });
    if (!confirmed) return;
    try {
      if (selectedEmployee) {
        await updateMutation.mutateAsync({ userId: selectedEmployee.userId, data: data as any });
        showSuccess(`Data pegawai "${data.name}" berhasil diubah!`);
      } else {
        const newEmployee = await createMutation.mutateAsync(data as any);
        if (data.isTeacher && newEmployee?.userId) {
            try {
                await accessControlService.assignRole(newEmployee.userId, 'teacher');
                showSuccess("Guru berhasil dibuat dan peran berhasil ditetapkan");
            } catch (roleError) {
                showError("Pegawai berhasil dibuat, tetapi gagal menetapkan peran guru");
                console.error(roleError);
            }
        } else {
            showSuccess(`Data pegawai "${data.name}" berhasil ditambahkan!`);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Gagal menyimpan data pegawai");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Pegawai",
      message: "Apakah Anda yakin ingin menghapus pegawai ini? Tindakan ini tidak dapat dibatalkan.",
    });
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        showSuccess("Pegawai berhasil dihapus!");
      } catch (error) {
        showError(error, "Gagal menghapus pegawai");
      }
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    const confirmed = await confirm({
      variant: "update",
      title: "Reset Kata Sandi",
      message: `Apakah Anda yakin ingin mereset kata sandi untuk ${name}? Kata sandi baru akan menjadi "Password123!".`,
    });
    if (confirmed) {
      try {
        await resetPasswordMutation.mutateAsync(id);
        showSuccess("Kata sandi berhasil direset!");
      } catch (error) {
        showError(error, "Gagal mereset kata sandi");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirm({
      variant: "delete",
      title: "Hapus Terpilih",
      message: `Hapus ${selectedIds.size} pegawai terpilih? Tindakan ini tidak dapat dibatalkan.`,
    });
    if (!confirmed) return;
    for (const id of selectedIds) {
      try { await deleteMutation.mutateAsync(id); } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    showSuccess("Pegawai terpilih berhasil dihapus.");
  };

  // ── Export/Import handlers ────────────────────────────────────────────────
  const handleExportExcel = useCallback(async (ids?: string[]) => {
    setIsExporting(true);
    try {
      const params = ids && ids.length > 0
        ? { ids: ids.join(',') }
        : { search: debouncedSearch || undefined, department: departmentFilter || undefined, employmentStatus: statusFilter || undefined };
      const blob = await profilesService.exportEmployeesExcel(params);
      downloadBlob(blob, "employees.xlsx");
      showSuccess("Excel berhasil diekspor!");
    } catch (err) {
      showError(err, "Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  }, [debouncedSearch, statusFilter, departmentFilter]);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = selectedIds.size > 0
        ? { ids: Array.from(selectedIds).join(',') }
        : { search: debouncedSearch || undefined, department: departmentFilter || undefined, employmentStatus: statusFilter || undefined };
      const blob = await profilesService.exportEmployeesPdf(params);
      downloadBlob(blob, "employees.pdf");
      showSuccess("PDF berhasil diekspor!");
    } catch (err) {
      showError(err, "Gagal mengekspor data");
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds, debouncedSearch, statusFilter, departmentFilter]);

  const handleDownloadTemplate = useCallback(async (withData: boolean) => {
    try {
      const blob = await profilesService.downloadEmployeesTemplate(withData);
      downloadBlob(blob, "employees-template.xlsx");
      showSuccess("Template berhasil diunduh!");
    } catch (err) {
      showError(err, "Gagal mengunduh template");
    }
  }, []);

  const handleImport = useCallback(async (file: File) => {
    try {
      const result = await importMutation.mutateAsync(file);
      if (result.errors && result.errors.length > 0) {
        showError(null, `Impor selesai dengan ${result.errors.length} kesalahan. Dibuat: ${result.created}, Diperbarui: ${result.updated}`);
      } else {
        showSuccess(`Impor berhasil! Dibuat: ${result.created}, Diperbarui: ${result.updated}`);
      }
      setIsImportModalOpen(false);
    } catch (err) {
      showError(err, "Gagal mengimpor data");
    }
  }, [importMutation]);

  return (
    <>
      <PageMeta title="Manajemen Pegawai | HR" description="Kelola pegawai dan guru pada sistem." />
      <PageBreadcrumb pageTitle="Manajemen Pegawai" />

      <div className="space-y-5">
        {/* ── Page header ── */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <UserCircleIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Manajemen Pegawai</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lihat dan kelola profil pegawai serta data kepegawaian.</p>
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
              onDownloadTemplate={() => handleDownloadTemplate(false)}
            />
            <button
              onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              <PlusIcon className="size-5" /> Tambah Pegawai Baru
            </button>
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && (
          <MobileFloatingActions
            onAdd={() => handleOpenModal()}
            addAriaLabel="Tambah Pegawai Baru"
            dataActionsProps={{
              isExporting: isExporting,
              isImporting: importMutation.isPending,
              onExportExcel: () => handleExportExcel(),
              onExportPdf: handleExportPdf,
              onExportExcelSelected: selectedIds.size > 0 ? () => handleExportExcel(Array.from(selectedIds)) : undefined,
              selectedCount: selectedIds.size,
              onImportClick: () => setIsImportModalOpen(true),
              onDownloadTemplate: () => handleDownloadTemplate(false)
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
                            Cari & Filter Pegawai
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Gunakan kriteria di bawah ini untuk menyaring data pegawai berdasarkan departemen dan status kepegawaian.
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
                        
                        <div className="grid grid-cols-1 gap-5 items-end sm:grid-cols-2 md:grid-cols-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Departemen</Label>
                                <CustomSelect
                                    value={departmentFilter}
                                    onChange={(val) => { setDepartmentFilter(val ? String(val) : ""); setPage(1); }}
                                    onClear={() => { setDepartmentFilter(""); setPage(1); }}
                                    placeholder="Semua Departemen"
                                    options={[
                                        { label: "IT", value: "IT" },
                                        { label: "HR", value: "HR" },
                                        { label: "Akademik", value: "ACADEMIC" },
                                        { label: "Keuangan", value: "FINANCE" },
                                    ]}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status</Label>
                                <CustomSelect
                                    value={statusFilter}
                                    onChange={(val) => { setStatusFilter(val ? String(val) : ""); setPage(1); }}
                                    onClear={() => { setStatusFilter(""); setPage(1); }}
                                    placeholder="Semua Status"
                                    options={[
                                        { label: "Tetap", value: "PERMANENT" },
                                        { label: "Kontrak", value: "CONTRACT" },
                                        { label: "Percobaan", value: "PROBATION" },
                                    ]}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nama atau ID</Label>
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
                                        placeholder="Cari berdasarkan Nama atau ID..."
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSearchTerm("");
                                        setDepartmentFilter("");
                                        setStatusFilter("");
                                        setPage(1);
                                    }}
                                    className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
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

        {/* ── Toolbar ── */}
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

        {/* ── Content: Responsive Switch ── */}
        {isMobile ? (
          <div className="space-y-3">
            {/* Mobile "select all" bar */}
            {infiniteEmployees.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} terpilih` : "Pilih semua"}
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
            ) : infiniteEmployees.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                  <UserCircleIcon className="size-7 opacity-30" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tidak ada pegawai yang ditemukan</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400"
                >
                  <PlusIcon className="size-3 fill-current" /> Tambah Pegawai Pertama
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {infiniteEmployees.map((employee: EmployeeProfile) => (
                  <EmployeeCard
                    key={employee.userId}
                    employee={employee}
                    isSelected={selectedIds.has(employee.userId)}
                    onToggle={() => toggleOne(employee.userId)}
                    onEdit={() => handleOpenModal(employee)}
                    onDelete={() => handleDelete(employee.userId)}
                    showResetPassword={showResetPassword}
                    onResetPassword={() => handleResetPassword(employee.userId, employee.user?.name || "Pegawai")}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {infiniteQuery.isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!infiniteQuery.hasNextPage && infiniteEmployees.length > 0 && (
                <p className="text-xs text-gray-400">Semua data telah dimuat</p>
              )}
            </div>
          </div>
        ) : (
          /* ── DESKTOP: Table with pagination ── */
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                  <TableRow>
                    <TableCell isHeader className="w-10 px-5 py-4">
                      <Checkbox checked={allSelected} onChange={toggleAll} />
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Informasi Pegawai
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID & NIP
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Departemen & Jabatan
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                      Status
                    </TableCell>
                    <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                      Aksi
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isLoading ? (
                    <SkeletonTable cols={6} hasCheckbox rows={limit} />
                  ) : sortedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-20 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                            <UserCircleIcon className="size-5 opacity-20" />
                          </div>
                          <p className="text-sm font-medium">Tidak ada pegawai yang cocok dengan pencarian Anda.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedEmployees.map((employee: EmployeeProfile) => {
                      const isSelected = selectedIds.has(employee.userId);
                      return (
                        <TableRow key={employee.userId} className={`group transition-colors ${isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"}`}>
                          <TableCell className="w-10 px-5 py-4">
                            <Checkbox checked={isSelected} onChange={() => toggleOne(employee.userId)} />
                          </TableCell>
                          <TableCell className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                  <div className={`flex size-10 items-center justify-center rounded-xl font-bold text-base overflow-hidden shrink-0 ${!employee.user?.photo ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : ''}`}>
                                      {employee.user?.photo ? (
                                          <img src={employee.user.photo} alt={employee.user.name} className="size-full object-cover" />
                                      ) : (
                                          employee.user?.name?.charAt(0) || "E"
                                      )}
                                  </div>
                                  <div>
                                      <p className="font-bold text-gray-900 dark:text-white text-theme-sm leading-tight">{employee.user?.name || "Pegawai Tidak Dikenal"}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{employee.user?.email || "Email tidak tertaut"}</p>
                                  </div>
                              </div>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                              <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">NIP</span>
                                      <span className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300">{employee.nip || "-"}</span>
                                  </div>
                                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                      <span className="font-mono">EID: {employee.employeeId}</span>
                                  </div>
                              </div>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                              <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
                                      <GridIcon className="size-3.5 text-brand-500" />
                                      {employee.position || "Staf"}
                                  </div>
                                  <p className="text-[11px] text-gray-400 uppercase tracking-wider">{employee.department || "Umum"}</p>
                              </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            <Badge color={employee.employmentStatus === 'PERMANENT' ? 'success' : employee.employmentStatus === 'CONTRACT' ? 'warning' : 'light'}>
                                {employee.employmentStatus === 'PERMANENT' ? 'Tetap' : employee.employmentStatus === 'CONTRACT' ? 'Kontrak' : employee.employmentStatus === 'PROBATION' ? 'Percobaan' : 'Tidak Diketahui'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            <RowActionMenu
                                onEdit={() => handleOpenModal(employee)}
                                onDelete={() => handleDelete(employee.userId)}
                                onAcademic={() => navigate(`/hr/employees/${employee.userId}/academic-profile`)}
                                showResetPassword={showResetPassword}
                                onResetPassword={() => handleResetPassword(employee.userId, employee.user?.name || "Pegawai")}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              
              {!isLoading && total > 0 && (
                <div className="border-t border-gray-100 dark:border-white/[0.05] p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                        <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                        <span className="font-medium text-gray-700 dark:text-white">{total}</span> employees
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
          </div>
        )}
      </div>

      {/* ── Modal (Create/Edit Form) ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-6xl"
        title={selectedEmployee ? 'Update Employee Profile' : 'Add New Employee'}
        description={selectedEmployee ? 'Modify existing employee data.' : 'Create and link a new employee.'}
        footer={
          <div className="flex justify-end gap-3">
            <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                form="employee-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 tracking-wide flex items-center gap-2"
            >
                {(createMutation.isPending || updateMutation.isPending) && (
                    <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {selectedEmployee ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        }
      >
        <div className="p-1">
            <form id="employee-form" onSubmit={handleSubmit(onSubmitForm)} className="flex flex-col lg:flex-row gap-8">
                {/* LEFT COLUMN: Photo & Key Info */}
                <div className="w-full lg:w-[240px] flex-shrink-0 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">Foto Profil</Label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="relative group cursor-pointer"
                        >
                            <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/[0.02] border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center transition-all group-hover:border-brand-500/50 group-hover:bg-brand-50/10 shadow-inner">
                                {previewPhoto ? (
                                    <img src={previewPhoto} alt="Pratinjau" className="size-full object-cover" />
                                ) : (
                                    <div className="text-center space-y-2 p-4">
                                        <UserCircleIcon className="size-12 mx-auto text-gray-300 dark:text-white/10 group-hover:text-brand-500 transition-colors" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Klik untuk<br/>Unggah</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/10 transition-colors flex items-center justify-center">
                                    <PlusIcon className="size-8 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept="image/*" 
                            />
                        </div>
                        {errors.photo && <p className="text-xs text-error-500">{errors.photo.message as string}</p>}
                        {previewPhoto && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewPhoto(null);
                                    setValue("photo", null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                className="flex items-center justify-center gap-2 text-sm text-error-500 font-bold hover:underline w-full"
                            >
                                <TrashBinIcon className="size-4" />
                                Hapus Foto
                            </button>
                        )}
                    </div>

                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-0">Status Akun</Label>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${watchIsActive ? 'text-success-600' : 'text-gray-400'}`}>
                                {watchIsActive ? 'AKTIF' : 'TIDAK AKTIF'}
                            </span>
                            <Controller
                                name="isActive"
                                control={control}
                                render={({ field }) => (
                                    <Switch checked={field.value ?? false} onChange={field.onChange} />
                                )}
                            />
                        </div>
                    </div>

                    {!selectedEmployee && (
                        <div className="bg-brand-50 dark:bg-brand-500/10 p-4 rounded-xl border border-brand-100 dark:border-brand-500/20 flex flex-col gap-2">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 mb-0">Tetapkan sebagai Guru</Label>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${watchIsTeacher ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                                    {watchIsTeacher ? 'YA' : 'TIDAK'}
                                </span>
                                <Controller
                                    name="isTeacher"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch checked={field.value ?? false} onChange={field.onChange} />
                                    )}
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Berikan hak akses guru kepada pegawai ini</p>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Inputs Grid */}
                <div className="flex-1 space-y-6">
                    {/* User Identity */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Identitas Pengguna</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label>Nama Lengkap <span className="text-error-500">*</span></Label>
                                <Input placeholder="Nama lengkap pegawai" {...register("name")} error={errors.name?.message} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Alamat Email <span className="text-error-500">*</span></Label>
                                <Input type="email" placeholder="pegawai@sekolah.com" {...register("email")} error={errors.email?.message} />
                            </div>
                            <div className="space-y-1.5">
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field }) => (
                                        <PhoneNumberInput label="Nomor Telepon" placeholder="8xx-xxxx-xxxx" value={field.value || ""} onChange={field.onChange} />
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Employment Info */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Detail Kepegawaian</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="col-span-1 space-y-1.5">
                                <Label>ID Pegawai <span className="text-error-500">*</span></Label>
                                <Input placeholder="EMP-XXXX" {...register("employeeId")} error={errors.employeeId?.message} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>NIP</Label>
                                <Input placeholder="ID Resmi" {...register("nip")} />
                            </div>
                            <div className="space-y-1.5">
                                <Controller
                                    name="employmentStatus"
                                    control={control}
                                    render={({ field }) => (
                                        <CustomSelect label="Status Kepegawaian" value={field.value || ""} options={[{label:"Tetap",value:"PERMANENT"},{label:"Kontrak",value:"CONTRACT"},{label:"Percobaan",value:"PROBATION"}]} onChange={(v) => field.onChange(String(v))} />
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Controller
                                    name="hireDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker label="Tanggal Bergabung" value={field.value || null} onChange={field.onChange} />
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Departemen</Label>
                                <Input placeholder="cth. IT" {...register("department")} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Jabatan</Label>
                                <Input placeholder="cth. Manajer" {...register("position")} />
                            </div>
                        </div>
                    </div>

                    {/* Personal Details */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Data Pribadi</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Controller
                                    name="nik"
                                    control={control}
                                    render={({ field }) => (
                                        <NumberInput label="NIK" placeholder="Nomor Induk Kependudukan" value={field.value || ""} onChange={field.onChange} />
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Controller
                                    name="gender"
                                    control={control}
                                    render={({ field }) => (
                                        <CustomSelect label="Jenis Kelamin" value={field.value || ""} options={[{label:"Laki-laki",value:"M"},{label:"Perempuan",value:"F"}]} onChange={(v) => field.onChange(String(v))} />
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tempat Lahir</Label>
                                <Input placeholder="Kota" {...register("placeOfBirth")} />
                            </div>
                            <div className="space-y-1.5">
                                <Controller
                                    name="dateOfBirth"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker label="Tanggal Lahir" value={field.value || null} onChange={field.onChange} />
                                    )}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Agama</Label>
                                <Input placeholder="Agama" {...register("religion")} />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Informasi Alamat</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label>Alamat Jalan</Label>
                                <textarea rows={2} {...register("address")} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none shadow-sm outline-none" placeholder="Alamat jalan lengkap..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Controller
                                        name="rt"
                                        control={control}
                                        render={({ field }) => (
                                            <NumberInput label="RT" placeholder="001" value={field.value || ""} onChange={field.onChange} />
                                        )}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Controller
                                        name="rw"
                                        control={control}
                                        render={({ field }) => (
                                            <NumberInput label="RW" placeholder="002" value={field.value || ""} onChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Kelurahan/Desa</Label>
                                <Input placeholder="Kelurahan" {...register("kelurahan")} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Kecamatan</Label>
                                <Input placeholder="Kecamatan" {...register("kecamatan")} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Provinsi</Label>
                                <Input placeholder="Provinsi" {...register("province")} />
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
      </Modal>

      {/* ── Import Modal ── */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => !importMutation.isPending && setIsImportModalOpen(false)}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        title="Impor Pegawai"
        isImporting={importMutation.isPending}
      />

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default EmployeesList;
