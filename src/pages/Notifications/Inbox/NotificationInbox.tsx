import React, { useEffect, useState } from "react";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import notificationService from "../../../api/services/notificationService";
import { Notification, NotificationMeta } from "../../../api/types/notification";
import { formatDistanceToNow } from "date-fns";
import { showSuccess, showError } from "../../../utils/toast";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { 
    ChevronLeftIcon, AngleRightIcon, MailIcon, 
    CheckCircleIcon, CheckLineIcon, PlusIcon,
    PencilIcon, TrashBinIcon
} from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import Modal from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import { useAuthStore } from "../../../store/authStore";

export default function NotificationInbox() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState<NotificationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread'>('all');
  
  const { confirm, confirmState } = useConfirm();

    // Modal & Actions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    userId: "", // Optional target user
    channel: "system",
  });
  
  // Check if user is a student to restrict "Send Notification"
  const isStudent = user?.userTypes?.includes('student');

  const fetchNotifications = async () => {
      try {
          setIsLoading(true);
          const res = await notificationService.getNotifications({ 
              page, 
              limit, 
              status: statusFilter === 'unread' ? 'unread' : undefined 
          });
          
          setNotifications(res.data.data);
          if (res.data.meta) {
              setMeta(res.data.meta);
          } else {
             // Fallback
             setMeta({
                 page, 
                 limit, 
                 total: res.data.data.length,
                 totalPages: 1
             });
          }
      } catch (error) {
          console.error(error);
          showError(error, "Failed to load notifications");
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      fetchNotifications();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter]);

  const handleToggleRead = async (id: string, isRead: boolean, e?: React.MouseEvent) => {
      e?.stopPropagation();
      try {
          if (isRead) {
               await notificationService.markAsUnread(id);
               setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: null } : n));
               showSuccess("Marked as unread");
          } else {
               await notificationService.markAsRead(id);
               setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
               showSuccess("Marked as read");
          }
      } catch (error) {
          console.error(error);
          showError(error, `Failed to mark as ${isRead ? 'unread' : 'read'}`);
      }
  };

  const handleMarkAllRead = async () => {
      const confirmed = await confirm({
          variant: 'info',
          title: 'Mark All as Read',
          message: 'Are you sure you want to mark all notifications as read?',
      });

      if (confirmed) {
          try {
              await notificationService.markAllAsRead();
              setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
              showSuccess("All notifications marked as read");
              fetchNotifications();
          } catch (error) {
              console.error(error);
              showError(error, "Failed to mark all as read");
          }
      }
  };

  const handleCreateOpen = () => {
    setEditingNotification(null);
    setFormData({ title: "", message: "", userId: "", channel: "system" });
    setIsModalOpen(true);
  };

  const handleEditOpen = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
        title: notification.title,
        message: notification.message,
        userId: "", // Can't edit target user usually, or fields might be missing in Type
        channel: notification.channel || "system"
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      variant: 'delete',
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
    });

    if (confirmed) {
      try {
        await notificationService.deleteNotification(id);
        showSuccess("Notification deleted");
        fetchNotifications();
      } catch (error) {
        showError(error, "Failed to delete notification");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only confirm if it's an update, creation (sending) might be quick action or also confirm? 
    // User requested "implement confirmation modal for Edit and Create".
    const confirmed = await confirm({
        variant: editingNotification ? 'update' : 'create',
        title: editingNotification ? 'Update Notification' : 'Send Notification',
        message: editingNotification 
            ? `Are you sure you want to update this notification?`
            : `Are you sure you want to send this notification?`
    });

    if (!confirmed) return;

    try {
        if (editingNotification) {
            await notificationService.updateNotification(editingNotification.id, {
                title: formData.title,
                message: formData.message
            });
            showSuccess("Notification updated");
        } else {
            await notificationService.createNotification(formData);
            showSuccess("Notification sent");
        }
        setIsModalOpen(false);
        fetchNotifications();
    } catch (error) {
        showError(error, editingNotification ? "Failed to update" : "Failed to send");
    }
  };


  const total = meta?.total || 0;
  const totalPages = meta?.totalPages || 1;

  return (
    <>
      <PageMeta
        title="Inbox | Visia"
        description="View your system notifications."
      />
      <PageBreadcrumb pageTitle="Inbox" />

      <div className="space-y-6">
          {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Inbox</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage and view your system alerts.</p>
            </div>
            <div className="flex gap-2">
                {!isStudent && (
                    <button
                        onClick={handleCreateOpen}
                        className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                    >
                        <PlusIcon className="fill-white text-xl text-white" />
                        Send Notification
                    </button>
                )}
            </div>
        </div>

         {/* Filters */}
         <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="w-full sm:w-48">
               <CustomSelect
                 label="Filter"
                 value={statusFilter}
                 onChange={(val) => { setStatusFilter(val as 'all' | 'unread'); setPage(1); }}
                 options={[
                   { label: "All Messages", value: "all" },
                   { label: "Unread Only", value: "unread" },
                 ]}
               />
             </div>
             
             <button
                onClick={handleMarkAllRead}
                className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:text-brand-600 dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10 shadow-sm"
            >
                <CheckCircleIcon className="size-4" />
                Mark all read
            </button>
         </div>

         {/* Table */}
         <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
            <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                        <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</TableCell>
                        <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</TableCell>
                        <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</TableCell>
                        <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</TableCell>
                        <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Actions</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                     {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                                    <span className="text-sm">Loading notifications...</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : notifications.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                                        <MailIcon className="size-5 opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium">No notifications found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        notifications.map((notif) => (
                            <TableRow key={notif.id} className={`group transition-colors ${!notif.readAt ? 'bg-brand-50/20 hover:bg-brand-50/40 dark:bg-brand-500/5 dark:hover:bg-brand-500/10' : 'hover:bg-gray-50/50 dark:hover:bg-white/[0.01]'}`}>
                                <TableCell className="px-5 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {new Date(notif.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="px-5 py-4">
                                     <span className={`text-sm ${!notif.readAt ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {notif.title}
                                     </span>
                                </TableCell>
                                <TableCell className="px-5 py-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 max-w-md">
                                        {notif.message}
                                    </p>
                                </TableCell>
                                <TableCell className="px-5 py-4 text-center">
                                    <Badge color={notif.readAt ? "success" : "warning"}>
                                        {notif.readAt ? "Read" : "Unread"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-5 py-4 text-center">
                                    <div className="flex justify-center gap-1">
                                        <button
                                            onClick={(e) => handleToggleRead(notif.id, !!notif.readAt, e)}
                                            className={`rounded-lg p-2 transition-colors ${
                                                notif.readAt 
                                                ? "text-gray-400 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-white/10" 
                                                : "text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                                            }`}
                                            title={notif.readAt ? "Mark as unread" : "Mark as read"}
                                        >
                                            {notif.readAt ? (
                                                <div className="size-4 rounded-full border-2 border-current opacity-60" />
                                            ) : (
                                                <CheckLineIcon className="size-4" />
                                            )}
                                        </button>
                                        <button
                                          onClick={() => handleEditOpen(notif)}
                                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                                          title="Edit"
                                        >
                                          <PencilIcon className="size-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(notif.id)}
                                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                                          title="Delete"
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

         {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> results
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

       {/* Create/Edit Modal */}
       <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNotification ? "Edit Notification" : "Send New Notification"}
        description={editingNotification ? "Update existing notification details." : "Compose and send a new system notification."}
        className="max-w-xl"
        footer={
             <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <button 
                    type="submit" 
                    form="notification-form"
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all rounded-lg bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                        {editingNotification ? "Update" : "Send"}
                  </button>
              </div>
        }
      >
          <form id="notification-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                  <Label>Title</Label>
                  <Input 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Brief title"
                    required
                  />
              </div>

              <div className="space-y-1">
                  <Label>Message</Label>
                  <textarea 
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-transparent text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white dark:focus:border-brand-800 min-h-[100px] resize-none"
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    placeholder="Enter notification content..."
                    required
                  />
              </div>

             {!editingNotification && (
                  <div className="space-y-1">
                      <Label>Recipient User ID <span className="text-gray-400 font-normal">(Optional)</span></Label>
                      <Input 
                        value={formData.userId}
                        onChange={e => setFormData({...formData, userId: e.target.value})}
                        placeholder="Leave empty for general system alert"
                      />
                      <p className="text-xs text-gray-400">If provided, notification will be sent only to this user.</p>
                  </div>
             )}
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
}
