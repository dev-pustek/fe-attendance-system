import React, { useState } from "react";
import { useAttendanceStatuses } from "../../api/hooks/useAttendance";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Badge from "../../components/atoms/Badge";
import Button from "../../components/atoms/Button";
import { PlusIcon, TrashIcon, EditIcon, ChevronLeftIcon, AngleRightIcon, TrashBinIcon } from "../../components/atoms/Icons";
import Modal from "../../components/molecules/Modal";
import FormInput from "../../components/molecules/FormInput";
import { useConfirm } from "../../hooks/useConfirm";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { showSuccess, showError } from "../../utils/toast";

const AttendanceStatuses: React.FC = () => {
  const { data: statusesResponse, isLoading, createMutation, updateMutation, deleteMutation } = useAttendanceStatuses();
  const statuses = statusesResponse?.data || [];
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const total = statuses.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedStatuses = statuses.slice((page - 1) * limit, page * limit);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleCreate = () => {
    setEditingStatus(null);
    setFormData({ name: "", code: "", description: "" });
    setIsModalOpen(true);
  };

  const handleEdit = (status: any) => {
    setEditingStatus(status);
    setFormData({ name: status.name, code: status.code, description: status.description || "" });
    setIsModalOpen(true);
  };

  const { confirm, confirmState } = useConfirm();

  const handleDelete = async (id: number) => {
    const shouldDelete = await confirm({
      title: "Delete Status",
      message: "Are you sure you want to delete this status? This action cannot be undone.",
      variant: "delete",
      confirmText: "Delete Status"
    });

    if (shouldDelete) {
        try {
            await deleteMutation.mutateAsync(id);
            showSuccess("Status deleted successfully");
        } catch (error) {
            showError(error, "Failed to delete status");
        }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const confirmed = await confirm({
        variant: 'delete',
        title: 'Bulk Delete Statuses',
        message: `Are you sure you want to permanently delete ${count} selected statuses? This action cannot be undone.`,
        confirmText: `Delete ${count} Statuses`
    });

    if (confirmed) {
        try {
            const promises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id));
            await Promise.all(promises);
            showSuccess(`Successfully removed ${count} statuses.`);
            setSelectedIds(new Set());
        } catch (error) {
            showError(error, "Failed to remove some statuses");
        }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(new Set(statuses.map((s: any) => s.id)));
      } else {
          setSelectedIds(new Set());
      }
  };

  const handleSelectRow = (id: number) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStatus) {
      updateMutation.mutate({ id: editingStatus.id, data: formData }, {
        onSuccess: () => setIsModalOpen(false)
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setIsModalOpen(false)
      });
    }
  };

  const getBadgeColor = (code: string) => {
      switch (code.toLowerCase()) {
          case 'present': return 'success';
          case 'late': return 'warning';
          case 'absent': return 'error';
          case 'leave': return 'info';
          default: return 'light';
      }
  }

  return (
    <>
      <PageMeta title="Attendance Statuses | Attendance" description="Manage attendance statuses" />
      <PageBreadcrumb pageTitle="Attendance Statuses" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Statuses</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage status definitions (Present, Late, etc.).</p>
          </div>
          <Button onClick={handleCreate}>
            <PlusIcon className="mr-2 size-4" />
            Add Status
          </Button>
        </div>

        {/* Bulk Selection Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm font-mono">
                {selectedIds.size}
              </div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Statuses Selected</p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-error-50 dark:bg-error-500/10 border border-error-100 dark:border-error-500/20 rounded-xl text-sm font-bold text-error-600 dark:text-error-400 hover:bg-error-100 transition-all shadow-sm"
                >
                    <TrashBinIcon className="size-4" />
                    Delete Selected
                </button>
                <button
                    onClick={() => setSelectedIds(new Set())}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-4 w-12">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        checked={statuses.length > 0 && selectedIds.size === statuses.length}
                        onChange={handleSelectAll}
                    />
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">Loading statuses...</TableCell>
                </TableRow>
              ) : statuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-gray-400">No statuses found.</TableCell>
                </TableRow>
              ) : (
                paginatedStatuses.map((status: any) => (
                  <TableRow key={status.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={selectedIds.has(status.id)}
                            onChange={() => handleSelectRow(status.id)}
                        />
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500">{status.id}</TableCell>
                    <TableCell className="px-5 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">{status.name}</span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                        <Badge color={getBadgeColor(status.code)}>{status.code}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500">{status.description || "-"}</TableCell>
                    <TableCell className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                onClick={() => handleEdit(status)}
                                className="p-1.5 text-gray-500 hover:text-brand-500 transition-colors"
                                title="Edit"
                            >
                                <EditIcon className="size-4" />
                            </button>
                            <button 
                                onClick={() => handleDelete(status.id)}
                                className="p-1.5 text-gray-500 hover:text-error-500 transition-colors"
                                title="Delete"
                            >
                                <TrashIcon className="size-4" />
                            </button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Client-Side Pagination */}
        {total > 0 && (
             <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                     Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                     <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                     <span className="font-medium text-gray-700 dark:text-white">{total}</span> items
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
                         <span className="text-sm text-gray-500 dark:text-gray-400">{totalPages}</span>
                     </div>
                     <button
                         onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                         disabled={page === totalPages}
                         className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.05]"
                     >
                         Next
                         <AngleRightIcon className="size-4" />
                     </button>
                </div>
             </div>
        )}

        <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            title={editingStatus ? "Edit Status" : "Add Status"} 
            description="Manage status definitions (Present, Late, etc.)."
            className="max-w-md"
            footer={
                <div className="flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors dark:text-gray-400 dark:hover:bg-white/5"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        form="status-form"
                        className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all"
                    >
                        {editingStatus ? "Update" : "Create"}
                    </button>
                </div>
            }
        >
            <form id="status-form" onSubmit={handleSubmit} className="space-y-4 p-1">
                <div>
                    <FormInput 
                        label="Name" 
                        id="status-name"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        required
                        placeholder="e.g. Present, Late, Absent"
                    />
                </div>
                <div>
                    <FormInput 
                        label="Code" 
                        id="status-code"
                        value={formData.code}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                        required
                        placeholder="e.g. PRESENT, LATE, ABSENT"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea 
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Optional description of the status..."
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                        rows={3}
                    />
                </div>
            </form>
        </Modal>

        <ConfirmDialog {...confirmState} />
      </div>
    </>
  );
};

export default AttendanceStatuses;
