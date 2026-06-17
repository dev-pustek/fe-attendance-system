import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// API
import {
  useParents, useParentsInfinite, useImportParents, useCreateParent,
  useUpdateParent, useDeleteParent, useParentStudents, useAssignStudentToParent, useStudents
} from "../../../api/hooks/useProfiles";
import { ParentProfile, StudentProfile } from "../../../api/types/profiles";
import { profilesService } from "../../../api/services/profilesService";

// Layout & Table
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";

// Forms & Modals
import { Modal } from "../../../components/molecules/Modal";
import CustomSelect from "../../../components/molecules/CustomSelect";
import ImportModal from "../../../components/molecules/ImportModal";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import SearchableAsyncSelect from "../../../components/molecules/SearchableAsyncSelect";
import Switch from "../../../components/atoms/Switch";
import PhoneNumberInput from "../../../components/atoms/PhoneNumberInput";
import DataActionsMenu from "../../../components/molecules/DataActionsMenu";
import MobileFloatingActions from "../../../components/molecules/MobileFloatingActions";

// Dialogs & Hooks
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../utils/toast";
import { useDebounce } from "../../../hooks/useDebounce";

// Mobile
import ParentCard from "./ParentCard";

// Icons
import {
  PlusIcon, PencilIcon, TrashBinIcon, ChevronLeftIcon, AngleRightIcon,
  UserCircleIcon, MoreDotIcon, EyeIcon, GroupIcon, FilterIcon, SearchIcon, ChevronDownIcon
} from "../../../components/atoms/Icons";

// ─── Helpers ───

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

const relationshipOptions = [
  { label: "Father", value: "Father" },
  { label: "Mother", value: "Mother" },
  { label: "Guardian", value: "Guardian" },
  { label: "Other", value: "Other" },
];

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-3 border-b border-gray-100 last:border-0 dark:border-white/5">
    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
    <span className="sm:col-span-2 text-sm font-medium text-gray-900 dark:text-white">{value || "-"}</span>
  </div>
);

// ─── Validation Schemas ───

const parentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  occupation: z.string().optional().or(z.literal("")),
  education: z.string().optional().or(z.literal("")),
  relationship: z.string().min(1, "Relationship is required"),
  notes: z.string().optional().or(z.literal("")),
});
type ParentFormValues = z.infer<typeof parentSchema>;

export default function ParentManagement() {
  const isMobile = useIsMobile();
  const { confirm, confirmState } = useConfirm();

  // ─── Filters & Selection ───
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);

  // ─── Modal State ───
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isChildrenModalOpen, setIsChildrenModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [selectedEntity, setSelectedEntity] = useState<ParentProfile | null>(null);
  const [selectedParentForChildren, setSelectedParentForChildren] = useState<ParentProfile | null>(null);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Queries & Mutations ───
  const queryParams = {
    page, limit,
    search: searchTerm || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    relationship: relationshipFilter === "" ? undefined : relationshipFilter,
  };

  const infiniteParams = {
    search: searchTerm || undefined,
    isActive: statusFilter === "" ? undefined : statusFilter === "true",
    relationship: relationshipFilter === "" ? undefined : relationshipFilter,
  };

  const query = useParents(queryParams);
  const infiniteQuery = useParentsInfinite(infiniteParams);
  const createMutation = useCreateParent();
  const updateMutation = useUpdateParent();
  const deleteMutation = useDeleteParent();
  const importMutation = useImportParents();

  const items = isMobile ? (infiniteQuery.data?.pages.flatMap(p => p.data) || []) : (query.data?.data || []);
  const total = query.data?.meta?.total || 0;
  const totalPages = query.data?.meta?.totalPages || 1;
  const isLoading = isMobile ? infiniteQuery.isLoading : query.isLoading;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMobile) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
        infiniteQuery.fetchNextPage();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, infiniteQuery]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, searchTerm, statusFilter, relationshipFilter]);

  // ─── Form Setup ───
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ParentFormValues>({
    resolver: zodResolver(parentSchema),
    defaultValues: { name: "", email: "", phone: "", isActive: true, occupation: "", education: "", relationship: "Father", notes: "" },
  });

  const handleOpenModal = (entity?: ParentProfile) => {
    if (entity) {
      setSelectedEntity(entity);
      reset({
        name: entity.user?.name || "",
        email: entity.user?.email || "",
        phone: entity.user?.phone || "",
        isActive: entity.user?.isActive ?? true,
        occupation: entity.occupation || "",
        education: entity.education || "",
        relationship: entity.relationship || "Father",
        notes: entity.notes || "",
      });
      setPreviewPhoto(entity.user?.photo || null);
    } else {
      setSelectedEntity(null);
      reset({ name: "", email: "", phone: "", isActive: true, occupation: "", education: "", relationship: "Father", notes: "" });
      setPreviewPhoto(null);
    }
    setPhotoFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmitForm = async (data: ParentFormValues) => {
    const confirmed = await confirm({
      variant: selectedEntity ? "update" : "create",
      title: selectedEntity ? "Update Parent" : "Create Parent",
      message: `Are you sure you want to ${selectedEntity ? "update" : "create"} "${data.name}"?`,
    });
    if (!confirmed) return;

    try {
      const payload: any = { ...data };
      if (photoFile) payload.photo = photoFile;

      if (selectedEntity) {
        if (!selectedEntity.userId) throw new Error("User ID is missing.");
        await updateMutation.mutateAsync({ userId: selectedEntity.userId, data: payload });
        showSuccess(`"${data.name}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(payload);
        showSuccess(`"${data.name}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save parent profile");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Parent",
      message: `Delete "${name}"? This cannot be undone.`,
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
      showSuccess("Parent deleted successfully.");
    } catch (err) {
      showError(err, "Failed to delete parent");
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Selected",
      message: `Delete ${selectedIds.size} parent(s)? This cannot be undone.`,
    });
    if (!confirmed) return;
    for (const id of Array.from(selectedIds)) {
      try { await deleteMutation.mutateAsync(id); } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    showSuccess("Selected parents deleted.");
  };

  // ─── Selection Helpers ───
  const allSelected = items.length > 0 && items.every((item: ParentProfile) => item.userId && selectedIds.has(item.userId));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((item: ParentProfile) => item.userId).filter(Boolean) as string[]));
  };
  const toggleOne = (id: string) => {
    if (!id) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Export / Import ───
  const handleExportExcel = useCallback(async (ids?: string[]) => {
    setIsExporting(true);
    try {
      const params = ids && ids.length > 0
        ? { ids: ids.join(',') }
        : { search: searchTerm || undefined, isActive: statusFilter === "" ? undefined : statusFilter === "true", relationship: relationshipFilter === "" ? undefined : relationshipFilter };
      const blob = await profilesService.exportParentsExcel(params);
      downloadBlob(blob, "parents.xlsx");
      showSuccess("Excel exported successfully!");
    } catch (err) {
      showError(err, "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [searchTerm, statusFilter, relationshipFilter]);

  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = selectedIds.size > 0
        ? { ids: Array.from(selectedIds).join(',') }
        : { search: searchTerm || undefined, isActive: statusFilter === "" ? undefined : statusFilter === "true", relationship: relationshipFilter === "" ? undefined : relationshipFilter };
      const blob = await profilesService.exportParentsPdf(params);
      downloadBlob(blob, "parents.pdf");
      showSuccess("PDF exported successfully!");
    } catch (err) {
      showError(err, "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [selectedIds, searchTerm, statusFilter, relationshipFilter]);

  const handleDownloadTemplate = useCallback(async (withData: boolean) => {
    setIsDownloadingTemplate(true);
    try {
      const blob = await profilesService.downloadParentsTemplate(withData);
      downloadBlob(blob, "parents-template.xlsx");
      showSuccess("Template downloaded!");
    } catch (err) {
      showError(err, "Download failed");
    } finally {
      setIsDownloadingTemplate(false);
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


  // ─── Assign Student Modals State ───
  const [assignFormData, setAssignFormData] = useState({ studentId: "", relationship: "Father", isPrimaryContact: false, canReceiveNotifications: true });
  const [studentSearch, setStudentSearch] = useState("");
  const debouncedStudentSearch = useDebounce(studentSearch, 500);
  const { data: studentsResponse } = useStudents({ page: 1, limit: 20, search: debouncedStudentSearch || undefined, isActive: true });
  
  const studentsOptions = useMemo(() => {
    return (studentsResponse?.data || []).map(s => ({
        label: s.user?.name || "Unknown Student",
        value: s.id,
        subLabel: `ID: ${s.studentId}${s.user?.email ? ` • ${s.user.email}` : ''}`
    }));
  }, [studentsResponse]);

  const { data: childrenResponse, isLoading: isChildrenLoading } = useParentStudents(selectedParentForChildren?.id);
  const assignMutation = useAssignStudentToParent();

  const handleViewChildren = (parent: ParentProfile) => {
    setSelectedParentForChildren(parent);
    setAssignFormData(prev => ({ ...prev, parentId: parent.id }));
    setIsChildrenModalOpen(true);
  };

  const handleOpenAssign = () => {
    setAssignFormData({
        studentId: "", relationship: "Father", isPrimaryContact: false, canReceiveNotifications: true,
        ...({ parentId: selectedParentForChildren?.id || "" })
    });
    setStudentSearch("");
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await assignMutation.mutateAsync(assignFormData as any);
        setIsAssignModalOpen(false);
    } catch { /* handled */ }
  };

  // ─── Row Action Component ───
  const RowActionMenu = ({ onEdit, onDelete, onViewDetail }: { onEdit: () => void, onDelete: () => void, onViewDetail: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="relative flex justify-center">
        <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200">
          <MoreDotIcon className="size-5" />
        </button>
        <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)}
          className="absolute right-0 top-full z-20 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900">
          <DropdownItem onClick={() => { setIsOpen(false); onViewDetail(); }} className="gap-2.5">
            <EyeIcon className="size-3.5" /> View Detail
          </DropdownItem>
          <DropdownItem onClick={() => { setIsOpen(false); onEdit(); }} className="gap-2.5">
            <PencilIcon className="size-3.5" /> Edit
          </DropdownItem>
          <DropdownItem onClick={() => { setIsOpen(false); onDelete(); }} className="gap-2.5 text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10">
            <TrashBinIcon className="size-3.5" /> Delete
          </DropdownItem>
        </Dropdown>
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Parent Management | SIAPUS" description="Manage system parents." />
      <PageBreadcrumb pageTitle="Parent Management" />

      <div className="space-y-5">
        {/* Page Header — HIDDEN on mobile */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <UserCircleIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Parent Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">View and manage parent profiles and their relationships.</p>
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
            <button onClick={() => handleOpenModal()}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]">
              <PlusIcon className="fill-white size-4" /> Add New Parent
            </button>
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && (
          <MobileFloatingActions
            onAdd={() => handleOpenModal()}
            addAriaLabel="Add New Parent"
            dataActionsProps={{
                isExporting: isExporting || isDownloadingTemplate,
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
                            Search & Filter Parents
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Use the criteria below to filter parent data based on relationship and status.
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
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Relationship</Label>
                                <CustomSelect
                                    value={relationshipFilter}
                                    onChange={(val) => { setRelationshipFilter(String(val)); setPage(1); }}
                                    options={[{ label: "All Relationships", value: "" }, ...relationshipOptions]}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
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
                            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
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
                                        placeholder="Search parent by name or email..."
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setSearchTerm("");
                                        setRelationshipFilter("");
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

        {/* Content — Responsive switch */}
        {isMobile ? (
          <div className="space-y-3">
            {items.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                <Checkbox checked={allSelected} onChange={toggleAll} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                </span>
              </div>
            )}

            {isLoading && items.length === 0 ? (
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
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                  <UserCircleIcon className="size-7 opacity-30" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No items found</p>
                <button onClick={() => handleOpenModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400">
                  <PlusIcon className="size-3 fill-current" /> Add First Parent
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {items.map((item: ParentProfile, index: number) => (
                  <ParentCard 
                    key={item.id || item.userId || `parent-${index}`} 
                    parent={item}
                    isSelected={item.userId ? selectedIds.has(item.userId) : false}
                    onToggle={() => item.userId && toggleOne(item.userId)}
                    onEdit={() => handleOpenModal(item)}
                    onDelete={() => item.userId && handleDelete(item.userId, item.user?.name || "Parent")}
                    onViewChildren={() => handleViewChildren(item)}
                    onViewDetail={() => { setSelectedEntity(item); setIsDetailModalOpen(true); }}
                  />
                ))}
              </div>
            )}

            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {infiniteQuery.isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!infiniteQuery.hasNextPage && items.length > 0 && (
                <p className="text-xs text-gray-400">All records loaded</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] [&_table_thead_th:first-child]:rounded-tl-xl [&_table_thead_th:last-child]:rounded-tr-xl">
            <Table>
              <TableHeader className="border-b border-gray-100 bg-gray-50/60 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <TableRow>
                  <TableCell isHeader className="w-10 px-4 py-3.5">
                    <Checkbox checked={allSelected} onChange={toggleAll} />
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Parent Information
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Occupation & Education
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Relationship
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Children
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading ? (
                  <SkeletonTable cols={6} hasCheckbox rows={limit} />
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center text-gray-400">
                      <div className="flex flex-col items-center gap-3 py-8">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                          <UserCircleIcon className="size-6 opacity-30" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No parents found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: ParentProfile, index: number) => {
                    const isSelected = item.userId ? selectedIds.has(item.userId) : false;
                    return (
                      <TableRow key={item.id || item.userId || `parent-row-${index}`} className={`group transition-colors ${
                        isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"
                      }`}>
                        <TableCell className="w-10 px-4 py-4">
                          <Checkbox checked={isSelected} onChange={() => item.userId && toggleOne(item.userId)} />
                        </TableCell>
                        <TableCell className="px-4 py-4 cursor-pointer" onClick={() => { setSelectedEntity(item); setIsDetailModalOpen(true); }}>
                          <div className="flex items-center gap-3">
                            <div className={`flex size-10 items-center justify-center rounded-xl font-bold text-base overflow-hidden ${!item.user?.photo ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : ''}`}>
                                {item.user?.photo ? (
                                    <img src={item.user.photo} alt={item.user.name} className="size-full object-cover" />
                                ) : (
                                    item.user?.name?.charAt(0) || "P"
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900 dark:text-white text-theme-sm leading-tight group-hover:text-brand-500 transition-colors">{item.user?.name || "Unknown Parent"}</p>
                                  {!item.user?.isActive && <Badge color="light">Inactive</Badge>}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.user?.email || "No email linked"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {item.occupation || "-"}
                              </div>
                              <p className="text-[11px] text-gray-400 uppercase tracking-wider">{item.education || "N/A"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <Badge color="light">
                            {item.relationship.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          {item.students && item.students.length > 0 ? (
                              <div className="flex flex-col items-start gap-0.5">
                                  <span className="text-sm font-bold text-gray-800 dark:text-white">
                                      {item.students.length} Student{item.students.length !== 1 ? 's' : ''}
                                  </span>
                                  <button
                                      onClick={() => handleViewChildren(item)}
                                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline uppercase tracking-wide"
                                  >
                                      See More
                                  </button>
                              </div>
                          ) : (
                              <span className="text-xs text-gray-400 italic">No children linked</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <RowActionMenu 
                            onViewDetail={() => { setSelectedEntity(item); setIsDetailModalOpen(true); }}
                            onEdit={() => handleOpenModal(item)} 
                            onDelete={() => item.userId && handleDelete(item.userId, item.user?.name || "Parent")} 
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {!isLoading && total > 0 && (
              <div className="flex flex-col gap-4 border-t border-gray-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Showing <span className="font-semibold text-gray-600 dark:text-gray-300">
                    {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
                  </span> of <span className="font-semibold text-gray-600 dark:text-gray-300">{total}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]">
                    <ChevronLeftIcon className="size-3.5" /> Prev
                  </button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      // Simple pagination logic for demo, ideally we calculate range based on current page
                      let p = i + 1;
                      if (totalPages > 5 && page > 3) p = page - 2 + i;
                      if (p > totalPages) return null;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                            page === p
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                          }`}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]">
                    Next <AngleRightIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      
      {/* 1. Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-4xl"
        title={selectedEntity ? "Update Parent Profile" : "Add New Parent"}
        description={selectedEntity ? "Modify existing parent data." : "Create and link a new parent."}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.05]">
              Cancel
            </button>
            <button type="submit" form="parent-form"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-600 disabled:opacity-50">
              {(createMutation.isPending || updateMutation.isPending) && (
                <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {selectedEntity ? "Save Changes" : "Create Profile"}
            </button>
          </div>
        }
      >
        <form id="parent-form" onSubmit={handleSubmit(onSubmitForm)} className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-[240px] flex-shrink-0 space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">Profile Photo</Label>
                    <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
                        <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/[0.02] border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center transition-all group-hover:border-brand-500/50 group-hover:bg-brand-50/10 shadow-inner">
                            {previewPhoto ? (
                                <img src={previewPhoto} alt="Preview" className="size-full object-cover" />
                            ) : (
                                <div className="text-center space-y-2 p-4">
                                    <UserCircleIcon className="size-12 mx-auto text-gray-300 dark:text-white/10 group-hover:text-brand-500 transition-colors" />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Click to<br/>Upload</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>
                    {previewPhoto && (
                        <button type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewPhoto(null);
                                setPhotoFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="flex items-center justify-center gap-2 text-sm text-error-500 font-bold hover:underline w-full mt-2">
                            <TrashBinIcon className="size-4" /> Remove Photo
                        </button>
                    )}
                </div>

                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-0">Account Status</Label>
                    <div className="flex items-center justify-between">
                        <Controller
                          name="isActive"
                          control={control}
                          render={({ field }) => (
                            <>
                              <span className={`text-xs font-bold ${field.value ? 'text-success-600' : 'text-gray-400'}`}>
                                  {field.value ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                              <Switch checked={field.value} onChange={field.onChange} />
                            </>
                          )}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-5">
                <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">User Credentials</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                            <Label>Full Name <span className="text-error-500">*</span></Label>
                            <Input placeholder="Enter parent's full name" {...register("name")} error={errors.name?.message} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Email Address</Label>
                            <Input type="email" placeholder="parent@example.com" {...register("email")} error={errors.email?.message} />
                        </div>
                        <Controller
                          name="phone"
                          control={control}
                          render={({ field }) => (
                            <div className="space-y-1.5">
                              <PhoneNumberInput label="Phone Number" placeholder="8xx-xxxx-xxxx" value={field.value || ""} onChange={field.onChange} />
                              {errors.phone && <p className="text-xs text-error-500">{errors.phone.message}</p>}
                            </div>
                          )}
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500 border-b border-gray-100 dark:border-white/5 pb-2 block">Profile Details</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Controller
                          name="relationship"
                          control={control}
                          render={({ field }) => (
                            <div className="md:col-span-1 space-y-1.5">
                              <CustomSelect label="Relationship" options={relationshipOptions} value={field.value} onChange={(val) => field.onChange(String(val))} />
                              {errors.relationship && <p className="text-xs text-error-500">{errors.relationship.message}</p>}
                            </div>
                          )}
                        />
                        <div className="space-y-1.5">
                            <Label>Occupation</Label>
                            <Input placeholder="e.g. Civil Engineer" {...register("occupation")} error={errors.occupation?.message} />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <Label>Education</Label>
                            <Input placeholder="e.g. Master's Degree" {...register("education")} error={errors.education?.message} />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <Label>Additional Notes</Label>
                            <textarea 
                                rows={2} placeholder="Enter any additional information here..." {...register("notes")}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none shadow-theme-xs"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </form>
      </Modal>

      {/* 2. Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => !importMutation.isPending && setIsImportModalOpen(false)}
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
        title="Import Parents"
        isImporting={importMutation.isPending}
      />

      {/* 3. Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} className="max-w-4xl">
        {selectedEntity && (
            <div className="p-8">
                <div className="flex flex-col md:flex-row gap-8 mb-10 pb-8 border-b border-gray-100 dark:border-white/5">
                    <div className="relative group">
                        <div className="w-[150px] aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 shadow-xl ring-4 ring-white dark:ring-gray-800 transition-transform group-hover:scale-[1.02]">
                            {selectedEntity.user?.photo ? (
                                <img src={selectedEntity.user.photo} alt={selectedEntity.user.name} className="size-full object-cover" />
                            ) : (
                                <div className="size-full flex items-center justify-center bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                    <span className="text-4xl font-bold">{selectedEntity.user?.name?.charAt(0) || "P"}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{selectedEntity.user?.name}</h2>
                                <Badge color="info" size="sm" className="px-3">{selectedEntity.relationship.toUpperCase()}</Badge>
                                <Badge color={selectedEntity.user?.isActive ? "success" : "light"} size="sm" className="px-3">
                                    {selectedEntity.user?.isActive ? "ACTIVE" : "INACTIVE"}
                                </Badge>
                            </div>
                            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{selectedEntity.user?.email || "No email provided"}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Occupation</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedEntity.occupation || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Education</p>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedEntity.education || "-"}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="w-1 h-4 bg-brand-500 rounded-full"></div> System Information
                            </h3>
                            <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-5 border border-gray-100 dark:border-white/5">
                                <DetailRow label="Parent ID" value={selectedEntity.parentId} />
                                <DetailRow label="System Status" value={selectedEntity.user?.isActive ? "Active User" : "Deactivated"} />
                                <DetailRow label="Phone" value={selectedEntity.user?.phone} />
                            </div>
                        </section>
                    </div>
                    <div className="space-y-8">
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="w-1 h-4 bg-brand-500 rounded-full"></div> Additional Information
                            </h3>
                            <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl p-5 border border-gray-100 dark:border-white/5">
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {selectedEntity.notes || "No additional notes provided for this parent."}
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        )}
      </Modal>

      {/* 4. Children Modal */}
      <Modal isOpen={isChildrenModalOpen} onClose={() => setIsChildrenModalOpen(false)} className="max-w-2xl" 
        title={`Students linked to ${selectedParentForChildren?.user?.name || 'Parent'}`}
        description="View and manage the students assigned to this parent account.">
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Linked Students</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total: {selectedParentForChildren?.students?.length || 0}</p>
                </div>
                <button onClick={handleOpenAssign} className="flex items-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">
                    <PlusIcon className="size-4" /> Assign Student
                </button>
            </div>
            <div className="space-y-4">
                {selectedParentForChildren?.students && selectedParentForChildren.students.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                        {selectedParentForChildren.students.map((student, index) => (
                            <div key={student.studentId || `student-${index}`} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                <div className="size-10 flex-shrink-0 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10">
                                    {student.studentPhoto ? (
                                        <img src={student.studentPhoto} alt={student.studentName} className="size-full object-cover" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                                            {student.studentName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{student.studentName}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge color="light" size="sm">{student.relationship}</Badge>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            ID: {student.studentProfile?.nisn || student.studentId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : isChildrenLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                        <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                        <span className="text-xs">Loading linked students...</span>
                    </div>
                ) : childrenResponse && childrenResponse.data?.length > 0 ? (
                    <div className="grid gap-3">
                        {childrenResponse.data.map((student: StudentProfile, index: number) => (
                            <div key={student.id || `child-${index}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                                <div className="size-10 rounded-full bg-brand-100 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 font-bold">
                                    {student.user?.name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{student.user?.name}</p>
                                    <p className="text-xs text-gray-500">{student.studentId} • {student.user?.activeClass?.name || "No Class"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 rounded-xl border-2 border-dashed border-gray-100 dark:border-white/5">
                        <GroupIcon className="size-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No students associated with this parent.</p>
                    </div>
                )}
            </div>
        </div>
      </Modal>

      {/* 5. Assign Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} className="max-w-xl">
         <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Assign Student</h2>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <SearchableAsyncSelect
                        label="Select Student"
                        value={assignFormData.studentId}
                        onChange={(val) => setAssignFormData({...assignFormData, studentId: String(val)})}
                        onSearch={(term) => setStudentSearch(term)}
                        options={studentsOptions}
                        isLoading={!studentsResponse}
                        placeholder="Search student by name..."
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label>Relationship</Label>
                        <CustomSelect 
                            label="Relationship" options={relationshipOptions} value={assignFormData.relationship}
                            onChange={(val) => setAssignFormData({...assignFormData, relationship: String(val)})}
                        />
                    </div>
                     <div className="space-y-1.5">
                        <Label>Notification Access</Label>
                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-white/10">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Receive Alerts</span>
                            <Switch checked={assignFormData.canReceiveNotifications || false} onChange={(val) => setAssignFormData({...assignFormData, canReceiveNotifications: val})} />
                        </div>
                    </div>
                </div>
                 <div className="space-y-1.5">
                        <Label>Primary Contact</Label>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                            <Switch checked={assignFormData.isPrimaryContact || false} onChange={(val) => setAssignFormData({...assignFormData, isPrimaryContact: val})} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Mark as primary contact for this student</span>
                        </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                    <button type="submit" disabled={assignMutation.isPending || !assignFormData.studentId}
                        className="px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-sm disabled:opacity-50 transition-colors hover:bg-brand-600">
                        {assignMutation.isPending ? 'Assigning...' : 'Assign Student'}
                    </button>
                </div>
            </form>
         </div>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};
