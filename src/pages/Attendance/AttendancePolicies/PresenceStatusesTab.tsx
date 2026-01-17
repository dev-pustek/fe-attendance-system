import React, { useState, useMemo } from "react";
import { useAttendanceStatuses } from "../../../api/hooks/useAttendance";
import { AttendanceStatus } from "../../../api/types/attendance";
import Badge from "../../../components/atoms/Badge";
import Button from "../../../components/atoms/Button";
import { PlusIcon, TrashIcon, EditIcon, ChevronLeftIcon, AngleRightIcon, GridIcon } from "../../../components/atoms/Icons";
import Modal from "../../../components/molecules/Modal";
import FormInput from "../../../components/molecules/FormInput";
import { useConfirm } from "../../../hooks/useConfirm";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useDebounce } from "../../../hooks/useDebounce";

const PresenceStatusesTab: React.FC = () => {
  const { data: statusesResponse, isLoading, createMutation, updateMutation, deleteMutation } = useAttendanceStatuses();
  const statuses = useMemo(() => statusesResponse?.data || [], [statusesResponse]);
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredStatuses = useMemo(() => {
    if (!debouncedSearch) return statuses;
    return statuses.filter((s: AttendanceStatus) => 
        s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        String(s.code).toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [statuses, debouncedSearch]);

  const total = filteredStatuses.length;
  const totalPages = Math.ceil(total / limit);

  // Simple client side pagination
  const paginatedStatuses = filteredStatuses.slice((page - 1) * limit, page * limit);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<AttendanceStatus | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });

  const handleCreate = () => {
    setEditingStatus(null);
    setFormData({ name: "", code: "", description: "" });
    setIsModalOpen(true);
  };

  const handleEdit = (status: AttendanceStatus) => {
    setEditingStatus(status);
    setFormData({ name: status.name, code: String(status.code), description: "" }); // description might be missing in type but was in component, assuming string. Actual type doesn't have description, checking usage. Type says 'code' is statusCode or string.
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
      deleteMutation.mutate(id);
    }
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 space-y-1.5 w-full sm:max-w-xs">
           <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Search</label>
           <div className="relative">
             <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
               <GridIcon className="size-4" />
             </div>
             <input
               type="text"
               placeholder="Search statuses..."
               value={searchQuery}
               onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
               className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500"
             />
           </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
             [...Array(6)].map((_, i) => (
                <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
             ))
        ) : paginatedStatuses.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-white/5">
                <div className="size-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                    <GridIcon className="size-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">No statuses found</p>
                <p className="text-xs text-gray-500 mt-1 mb-4">Add a new presence status to get started.</p>
                <Button onClick={handleCreate} size="sm">
                    Create Status
                </Button>
            </div>
        ) : (
          <>
            {/* Add New Status Card */}
            <div 
                onClick={handleCreate}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/20 p-5 transition-all hover:bg-white hover:shadow-xl hover:shadow-brand-500/10 hover:border-brand-500/40 dark:border-brand-500/20 dark:bg-brand-500/[0.02] dark:hover:bg-brand-500/[0.08] dark:hover:border-brand-500/40 cursor-pointer overflow-hidden min-h-[130px]"
            >
                {/* Decorative Background Elements */}
                <div className="absolute -right-6 -top-6 size-24 rounded-full bg-brand-500/5 blur-3xl transition-all group-hover:bg-brand-500/15" />
                <div className="absolute -left-6 -bottom-6 size-24 rounded-full bg-brand-500/5 blur-3xl transition-all group-hover:bg-brand-500/15" />
                
                <div className="relative">
                    <div className="size-12 rounded-xl bg-white dark:bg-white/5 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 ring-1 ring-brand-100 dark:ring-brand-500/20 group-hover:ring-brand-500/30">
                        <PlusIcon className="size-6 text-brand-500" />
                    </div>
                </div>
                
                <div className="text-center relative">
                    <span className="text-base font-bold text-gray-900 dark:text-white block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        Add Status
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        New definitions
                    </p>
                </div>
            </div>

            {paginatedStatuses.map((status: AttendanceStatus) => (
            <div 
                key={status.id} 
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-500/30 dark:border-white/[0.05] dark:bg-white/[0.03] dark:hover:border-brand-500/30 overflow-hidden"
            >
                <div className="p-5 flex flex-col gap-4">
                     <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                {status.name}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Status Definition</span>
                        </div>
                        <Badge color={getBadgeColor(String(status.code))} className="font-mono tracking-wider">
                            {status.code}
                        </Badge>
                     </div>
                     
                     {status.description && (
                         <p className="text-xs text-gray-500 line-clamp-2">
                             {status.description}
                         </p>
                     )}
                </div>

                <div className="flex items-center justify-end px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 gap-2">
                    <button 
                        onClick={() => handleEdit(status)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-brand-50 hover:text-brand-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                    >
                        <EditIcon className="size-3.5" /> Edit
                    </button>
                    <button 
                        onClick={() => handleDelete(status.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-gray-600 bg-white hover:bg-error-50 hover:text-error-600 rounded-lg border border-gray-200 transition-all dark:bg-white/5 dark:text-gray-300 dark:border-white/10 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                    >
                        <TrashIcon className="size-3.5" />
                    </button>
                </div>
            </div>
          ))}
          </>
        )}
      </div>

          {total > 0 && (
            <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
                  <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
                  <span className="font-medium text-gray-700 dark:text-white">{total}</span> statuses
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

      <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={editingStatus ? "Edit Status" : "Add Status"} 
          description="Definitions for attendance records."
          className="max-w-md"
          footer={
              <div className="flex justify-end gap-3">
                  <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                      Cancel
                  </button>
                  <button 
                      type="submit" 
                      form="status-form-tab"
                      className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all"
                  >
                      {editingStatus ? "Update" : "Create"}
                  </button>
              </div>
          }
      >
          <form id="status-form-tab" onSubmit={handleSubmit} className="space-y-4 p-1">
              <div>
                  <FormInput 
                      label="Name" 
                      id="status-name"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                      placeholder="e.g. Present, Late"
                  />
              </div>
              <div>
                  <FormInput 
                      label="Code" 
                      id="status-code"
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      required
                      placeholder="e.g. PRESENT, LATE"
                  />
              </div>
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </div>
  );
};

export default PresenceStatusesTab;
