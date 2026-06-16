import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatDistanceToNow } from "date-fns";

import { useAuthStore } from "../../../store/authStore";
import { useConfirm } from "../../../hooks/useConfirm";
import { showSuccess, showError } from "../../../utils/toast";

import { 
    useNotifications, 
    useNotificationsInfinite,
    useMarkNotificationRead,
    useMarkNotificationUnread,
    useMarkAllNotificationsRead
} from "../../../api/hooks/useNotifications";
import { Notification } from "../../../api/types/notification";

import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { 
    ChevronLeftIcon, AngleRightIcon, MailIcon, 
    CheckCircleIcon, CheckLineIcon, PlusIcon,
    PencilIcon, TrashBinIcon, FilterIcon, SearchIcon,
    ChevronDownIcon, ChevronUpIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import Modal from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import Checkbox from "../../../components/atoms/Checkbox";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { SkeletonTable } from "../../../components/molecules/SkeletonRow";
import Dropdown from "../../../components/molecules/Dropdown";
import DropdownItem from "../../../components/atoms/DropdownItem";
import NotificationCard from "./NotificationCard";

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
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

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

const notificationSchema = z.object({
  title: z.string().min(1, "Judul diperlukan"),
  message: z.string().min(1, "Pesan diperlukan"),
  userId: z.string().optional(),
  channel: z.string().default("system"),
});
type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function NotificationInbox() {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const isSuperAdmin = user?.userTypes?.some((role: string) => ["superadmin", "super admin", "admin"].includes(role.toLowerCase()));

  // ── Desktop pagination & filter state ────────────────────────────────────
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'read' | 'unread' | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { confirm, confirmState } = useConfirm();

  // ── Modals & Form ────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: { title: "", message: "", userId: "", channel: "system" },
  });

  // ── Queries & Mutations ──────────────────────────────────────────────────
  const queryParams = {
      status: statusFilter,
      page,
      limit,
  };
  
  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useNotifications(queryParams);
  const infiniteQuery = useNotificationsInfinite({ status: statusFilter });
  
  const markReadMutation = useMarkNotificationRead();
  const markUnreadMutation = useMarkNotificationUnread();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = response?.data?.data || (Array.isArray(response?.data) ? response?.data : []);
  const total = Number(response?.data?.total ?? response?.data?.meta?.total ?? 0);
  const totalPages = Number(response?.data?.totalPages ?? response?.data?.meta?.totalPages ?? Math.ceil(total / limit));

  // Mobile infinite cards
  const infiniteNotifications = infiniteQuery.data?.pages.flatMap((p: any) => p?.data?.data || (Array.isArray(p?.data) ? p?.data : [])) ?? [];

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

  // Clear selection on filter change
  useEffect(() => { setSelectedIds(new Set()); }, [page, statusFilter]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const displayNotifications = isMobile ? infiniteNotifications : notifications;
  const allSelected = displayNotifications.length > 0 && displayNotifications.every((n: Notification) => selectedIds.has(n.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayNotifications.map((n: Notification) => n.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleRead = async (notification: Notification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
        if (notification.readAt) {
             await markUnreadMutation.mutateAsync(notification.id);
             showSuccess("Ditandai sebagai belum dibaca");
        } else {
             await markReadMutation.mutateAsync(notification.id);
             showSuccess("Ditandai sebagai dibaca");
        }
    } catch (error) {
        showError(error, "Gagal mengubah status");
    }
  };

  const handleMarkAllRead = async () => {
    const confirmed = await confirm({
        variant: 'info',
        title: 'Tandai Semua Dibaca',
        message: 'Apakah Anda yakin ingin menandai semua notifikasi sebagai telah dibaca?',
        confirmText: 'Tandai Semua Dibaca'
    });

    if (confirmed) {
        try {
            await markAllReadMutation.mutateAsync();
            showSuccess("Semua notifikasi berhasil ditandai sebagai dibaca");
        } catch (error) {
            showError(error, "Gagal menandai semua sebagai dibaca");
        }
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      const promises = Array.from(selectedIds).map(id => markReadMutation.mutateAsync(id));
      await Promise.all(promises);
      showSuccess(`Berhasil menandai ${selectedIds.size} notifikasi sebagai dibaca.`);
      setSelectedIds(new Set());
    } catch (error) {
      showError(error, "Gagal menandai beberapa notifikasi");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Hapus Notifikasi Terpilih',
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.size} notifikasi secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: `Hapus ${selectedIds.size} Notifikasi`
    });

    if (confirmed) {
      try {
        const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id));
        await Promise.all(promises);
        showSuccess(`Berhasil menghapus ${selectedIds.size} notifikasi.`);
        setSelectedIds(new Set());
      } catch (error) {
        showError(error, "Gagal menghapus beberapa notifikasi");
      }
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Hapus Notifikasi',
      message: 'Apakah Anda yakin ingin menghapus notifikasi ini?',
      confirmText: 'Hapus'
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(id);
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        showSuccess("Notifikasi berhasil dihapus");
      } catch (error) {
        showError(error, "Gagal menghapus notifikasi");
      }
    }
  };

  const handleOpenModal = (notification?: Notification) => {
    if (notification) {
      setEditingNotification(notification);
      reset({
        title: notification.title,
        message: notification.message,
        userId: "",
        channel: notification.channel || "system",
      });
    } else {
      setEditingNotification(null);
      reset({ title: "", message: "", userId: "", channel: "system" });
    }
    setIsModalOpen(true);
  };

  const onSubmitForm = async (data: NotificationFormValues) => {
    const confirmed = await confirm({
        variant: editingNotification ? 'update' : 'create',
        title: editingNotification ? 'Perbarui Notifikasi' : 'Kirim Notifikasi',
        message: editingNotification 
            ? `Apakah Anda yakin ingin memperbarui notifikasi ini?`
            : `Apakah Anda yakin ingin mengirim notifikasi ini?`,
        confirmText: editingNotification ? 'Perbarui' : 'Kirim'
    });

    if (!confirmed) return;

    try {
        if (editingNotification) {
            await updateMutation.mutateAsync({ id: editingNotification.id, data });
            showSuccess("Notifikasi berhasil diperbarui");
        } else {
            await createMutation.mutateAsync(data);
            showSuccess("Notifikasi berhasil dikirim");
        }
        setIsModalOpen(false);
    } catch (error) {
        showError(error, editingNotification ? "Gagal memperbarui notifikasi" : "Gagal mengirim notifikasi");
    }
  };

  return (
    <>
      <PageMeta
        title="Kotak Masuk | SIAPUS"
        description="Kelola dan lihat pemberitahuan sistem Anda."
      />
      <PageBreadcrumb pageTitle="Kotak Masuk Notifikasi" />

      <div className="space-y-5">
        {/* ── Page header ── */}
        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <MailIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Kotak Masuk Notifikasi</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kelola dan lihat pemberitahuan sistem Anda.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
                onClick={handleMarkAllRead}
                className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:text-brand-600 dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10 shadow-sm active:scale-[.98]"
            >
                <CheckCircleIcon className="size-4" />
                Tandai Semua Dibaca
             </button>
            {isSuperAdmin && (
              <button
                onClick={() => handleOpenModal()}
                className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[.98]"
              >
                <PlusIcon className="fill-white size-4" />
                Kirim Notifikasi
              </button>
            )}
          </div>
        </div>

        {/* Mobile FAB */}
        {isMobile && isSuperAdmin && (
          <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-3 items-end">
             <button
              onClick={handleMarkAllRead}
              className="flex size-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-[0_4px_20px_rgb(0,0,0,0.1)] border-2 border-gray-200 transition-transform active:scale-95 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
              aria-label="Tandai Semua Dibaca"
            >
              <CheckCircleIcon className="size-5" />
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex size-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
              aria-label="Kirim Notifikasi"
            >
              <PlusIcon className="size-5 fill-white" />
            </button>
          </div>
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
                            Saring Notifikasi
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Gunakan kriteria di bawah untuk menyaring berdasarkan status.
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
                        
                        <div className="grid grid-cols-1 gap-5 items-end sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5 w-full">
                                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Status Pembacaan</Label>
                                <CustomSelect
                                    value={statusFilter}
                                    onChange={(val) => { setStatusFilter(val as 'read' | 'unread' | ''); setPage(1); }}
                                    options={[
                                        { label: "Semua Pesan", value: "" },
                                        { label: "Sudah Dibaca", value: "read" },
                                        { label: "Belum Dibaca", value: "unread" },
                                    ]}
                                    className="w-full [&>button]:w-full [&>button]:h-11 [&>button]:text-sm [&>button]:rounded-xl"
                                />
                            </div>
                            <div className="flex items-center gap-3 w-full lg:col-start-4">
                                <button
                                    onClick={() => {
                                        setStatusFilter("");
                                        setPage(1);
                                    }}
                                    className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/[0.05]"
                                >
                                    Setel Ulang
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
              label: "Tandai Dibaca",
              icon: <CheckCircleIcon className="size-3.5" />,
              onClick: handleBulkMarkRead,
              variant: "primary",
            },
            {
              label: "Hapus Terpilih",
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
            {infiniteNotifications.length > 0 && (
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
            ) : infiniteNotifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                  <MailIcon className="size-7 opacity-30" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tidak ada notifikasi</p>
                {isSuperAdmin && (
                  <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400"
                  >
                    <PlusIcon className="size-3 fill-current" /> Kirim Notifikasi
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {infiniteNotifications.map((notif: Notification) => (
                  <NotificationCard
                    key={notif.id}
                    notification={notif}
                    isSelected={selectedIds.has(notif.id)}
                    onToggle={() => toggleOne(notif.id)}
                    onEdit={() => handleOpenModal(notif)}
                    onDelete={() => handleDelete(notif.id)}
                    onToggleRead={() => handleToggleRead(notif)}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 flex items-center justify-center">
              {infiniteQuery.isFetchingNextPage && (
                <div className="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              )}
              {!infiniteQuery.hasNextPage && infiniteNotifications.length > 0 && (
                <p className="text-xs text-gray-400">Semua data dimuat</p>
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
                    <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal</TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Judul</TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pesan</TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableCell>
                    <TableCell isHeader className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {isLoading ? (
                    <SkeletonTable cols={6} hasCheckbox rows={limit} />
                  ) : notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
                            <MailIcon className="size-7 opacity-30" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tidak ada notifikasi</p>
                            <p className="mt-0.5 text-xs text-gray-400">Cobalah mengubah pencarian atau buat pesan baru.</p>
                          </div>
                          {isSuperAdmin && (
                            <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400">
                              <PlusIcon className="size-3 fill-current" /> Kirim Notifikasi
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    notifications.map((notif: Notification) => {
                      const isSelected = selectedIds.has(notif.id);
                      return (
                        <TableRow key={notif.id} className={`group cursor-pointer transition-colors ${isSelected ? "bg-brand-50/60 dark:bg-brand-500/5" : "hover:bg-gray-50/60 dark:hover:bg-white/[0.015]"} ${!notif.readAt && !isSelected ? "bg-brand-50/20 dark:bg-brand-500/5" : ""}`} onClick={() => handleToggleRead(notif)}>
                          <TableCell className="w-10 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={isSelected} onChange={() => toggleOne(notif.id)} />
                          </TableCell>
                          <TableCell className="px-4 py-4 whitespace-nowrap">
                             <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('id-ID') : "—"}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : ''}
                                </span>
                             </div>
                          </TableCell>
                          <TableCell className="px-4 py-4">
                             <span className={`text-sm ${!notif.readAt ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-600 dark:text-gray-300'}`}>
                                {notif.title}
                             </span>
                          </TableCell>
                          <TableCell className="px-4 py-4 max-w-sm">
                             <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                 {notif.message}
                             </p>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <Badge color={notif.readAt ? "success" : "warning"}>
                              {notif.readAt ? "Dibaca" : "Belum Dibaca"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                             <div className="flex justify-center items-center gap-1">
                                <button
                                    onClick={(e) => handleToggleRead(notif, e)}
                                    className={`rounded-lg p-2 transition-colors ${
                                        notif.readAt 
                                        ? "text-gray-400 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-white/10" 
                                        : "text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                                    }`}
                                    title={notif.readAt ? "Tandai belum dibaca" : "Tandai dibaca"}
                                >
                                    {notif.readAt ? (
                                        <div className="size-4 rounded-full border-2 border-current opacity-60" />
                                    ) : (
                                        <CheckLineIcon className="size-4" />
                                    )}
                                </button>
                                <RowActionMenu onEdit={() => handleOpenModal(notif)} onDelete={() => handleDelete(notif.id)} />
                             </div>
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
                  <span className="font-medium text-gray-700 dark:text-white">{total}</span> hasil
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
          </>
        )}
      </div>

       {/* Create/Edit Modal */}
       <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNotification ? "Edit Notifikasi" : "Kirim Notifikasi Baru"}
        description={editingNotification ? "Perbarui detail notifikasi yang ada." : "Buat dan kirim pesan notifikasi sistem baru."}
        className="max-w-xl"
        footer={
             <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
                  <button 
                    type="submit" 
                    form="notification-form"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all rounded-lg bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                        {isSubmitting ? (
                          <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : null}
                        {editingNotification ? "Perbarui" : "Kirim"}
                  </button>
              </div>
        }
      >
          <form id="notification-form" onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div className="space-y-1">
                  <Label>Judul</Label>
                  <Input 
                    {...register("title")}
                    placeholder="Judul singkat pesan"
                  />
                  {errors.title && <span className="text-xs text-error-500">{errors.title.message}</span>}
              </div>

              <div className="space-y-1">
                  <Label>Pesan</Label>
                  <textarea 
                    {...register("message")}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 bg-transparent text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-brand-400 min-h-[100px] resize-none"
                    placeholder="Masukkan isi notifikasi..."
                  />
                  {errors.message && <span className="text-xs text-error-500">{errors.message.message}</span>}
              </div>

             {!editingNotification && (
                  <div className="space-y-1">
                      <Label>ID Pengguna Penerima <span className="text-gray-400 font-normal">(Opsional)</span></Label>
                      <Input 
                        {...register("userId")}
                        placeholder="Kosongkan untuk peringatan sistem umum"
                      />
                      <p className="text-xs text-gray-400">Jika diisi, notifikasi hanya akan dikirimkan kepada pengguna ini.</p>
                  </div>
             )}
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
}
