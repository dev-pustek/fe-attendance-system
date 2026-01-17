import React, { useEffect, useState, useMemo } from "react";
import PageMeta from "../../../components/atoms/PageMeta";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { 
    PlusIcon, PencilIcon, TrashIcon, GridIcon, MailIcon, 
    ChevronLeftIcon, AngleRightIcon, ChevronUpIcon, ChevronDownIcon
} from "../../../components/atoms/Icons";
import Modal from "../../../components/molecules/Modal";
import Button from "../../../components/atoms/Button";
import Input from "../../../components/atoms/InputField";
import Label from "../../../components/atoms/Label";
import notificationService from "../../../api/services/notificationService";
import { NotificationTemplate, NotificationMeta } from "../../../api/types/notification";
import { showSuccess, showError } from "../../../utils/toast";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../../components/atoms/Table";
import CustomSelect from "../../../components/molecules/CustomSelect";
import { useDebounce } from "../../../hooks/useDebounce";
import ConfirmDialog from "../../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../../hooks/useConfirm";
import Switch from "../../../components/atoms/Switch";

export default function NotificationTemplateList() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [meta, setMeta] = useState<NotificationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: keyof NotificationTemplate; direction: "asc" | "desc" } | null>(null);

  // Modal & Actions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const { confirm, confirmState } = useConfirm();

  // Form State
  const [formData, setFormData] = useState<Partial<NotificationTemplate>>({
    code: "",
    name: "",
    subject: "",
    bodyTemplate: "",
    notificationChannels: "email",
    isActive: true
  });

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await notificationService.getTemplates({
          page,
          limit,
          search: debouncedSearch || undefined,
          isActive: statusFilter === "" ? undefined : statusFilter === "true"
      });
      setTemplates(res.data.data);
       // Check if meta exists and assign default if not
       if (res.data.meta) {
           setMeta(res.data.meta);
       } else {
           // Fallback if API doesn't return meta yet (mocking pagination behavior locally if needed, but better to rely on API)
           setMeta({
               page: 1, limit: res.data.data.length, total: res.data.data.length, totalPages: 1
           });
       }
    } catch (error) {
      console.error(error);
      showError(error, "Failed to fetch templates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedSearch, statusFilter]);

  // Client-side Sorting (if API doesn't support it yet, or purely UI)
  const sortedTemplates = useMemo(() => {
    if (!sortConfig) return templates;
    return [...templates].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = String(a[key] ?? "");
      const valB = String(b[key] ?? "");
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [templates, sortConfig]);

  const handleSort = (key: keyof NotificationTemplate) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

   const SortHelper = ({ column }: { column: keyof NotificationTemplate }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const handleCreateOpen = () => {
    setEditingTemplate(null);
    setFormData({
        code: "",
        name: "",
        subject: "",
        bodyTemplate: "",
        notificationChannels: "email",
        isActive: true
    });
    setIsModalOpen(true);
  };

  const handleEditOpen = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({ ...template });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
     const confirmed = await confirm({
       variant: 'delete',
       title: 'Delete Template',
       message: 'Are you sure you want to delete this template? This action cannot be undone.',
     });

    if (confirmed) {
        try {
            await notificationService.deleteTemplate(id);
            showSuccess("Template deleted successfully");
            fetchTemplates();
        } catch (error) {
            showError(error, "Failed to delete template");
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const confirmed = await confirm({
        variant: editingTemplate ? 'update' : 'create',
        title: editingTemplate ? 'Update Template' : 'Create Template',
        message: `Are you sure you want to ${editingTemplate ? 'update' : 'create'} this template?`,
      });

      if (!confirmed) return;

      try {
          if (editingTemplate) {
              await notificationService.updateTemplate(editingTemplate.id, formData);
              showSuccess("Template updated successfully");
          } else {
              // @ts-expect-error - id is missing in payload but ignored by create
              await notificationService.createTemplate(formData);
              showSuccess("Template created successfully");
          }
          setIsModalOpen(false);
          fetchTemplates();
      } catch (error) {
          showError(error, editingTemplate ? "Failed to update" : "Failed to create");
      }
  };

  const total = meta?.total || 0;
  const totalPages = meta?.totalPages || 1;

  return (
    <>
      <PageMeta
        title="Notification Templates | Sistem Absen"
        description="Manage system notification templates."
      />
      <PageBreadcrumb pageTitle="Notification Templates" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Templates</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Define and manage email and push notification templates.</p>
            </div>
            <button
                onClick={handleCreateOpen}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
                <PlusIcon className="fill-white text-xl text-white" />
                Add Template
            </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
           <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
             <div className="flex-1 space-y-1.5">
                <label className="text-xs font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Template</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <GridIcon className="size-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                  />
                </div>
             </div>

             <div className="w-full sm:w-48">
               <CustomSelect
                 label="Status"
                 value={statusFilter}
                 onChange={(val: string | number) => { setStatusFilter(String(val)); setPage(1); }}
                 options={[
                   { label: "All Status", value: "" },
                   { label: "Active", value: "true" },
                   { label: "Inactive", value: "false" },
                 ]}
               />
             </div>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
            <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                        <TableCell isHeader className="px-5 py-4">
                            <button onClick={() => handleSort("name")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                Template Name <SortHelper column="name" />
                            </button>
                        </TableCell>
                         <TableCell isHeader className="px-5 py-4">
                            <button onClick={() => handleSort("subject")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                                Subject <SortHelper column="subject" />
                            </button>
                        </TableCell>
                        <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Channels</TableCell>
                        <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</TableCell>
                        <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                                    <span className="text-sm">Loading templates...</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : sortedTemplates.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="py-12 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                                        <MailIcon className="size-5 opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium">No templates found.</p>
                                    <button onClick={handleCreateOpen} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                                        <PlusIcon className="fill-white text-xl text-white" />
                                        Create your first template
                                    </button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedTemplates.map((tpl) => (
                            <TableRow key={tpl.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                <TableCell className="px-5 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                                          <MailIcon className="size-4 text-gray-500" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900 dark:text-white text-theme-sm">{tpl.name}</p>
                                          <p className="text-[11px] text-gray-500 font-mono uppercase">{tpl.code}</p>
                                        </div>
                                      </div>
                                </TableCell>
                                <TableCell className="px-5 py-4">
                                    <span className="text-theme-sm text-gray-600 dark:text-gray-400 line-clamp-1">{tpl.subject}</span>
                                </TableCell>
                                <TableCell className="px-5 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                        {tpl.notificationChannels}
                                    </span>
                                </TableCell>
                                <TableCell className="px-5 py-4 text-center">
                                     <div className="flex items-center justify-center">
                                        <Switch 
                                            checked={tpl.isActive} 
                                            onChange={() => notificationService.updateTemplate(tpl.id, { isActive: !tpl.isActive }).then(fetchTemplates)} 
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="px-5 py-4 text-right">
                                     <div className="flex justify-end gap-1">
                                        <button
                                          onClick={() => handleEditOpen(tpl)}
                                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                                        >
                                          <PencilIcon className="size-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete(tpl.id)}
                                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
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
        title={editingTemplate ? "Update Template" : "Create New Template"}
        description="Configure notification template details."
        className="max-w-2xl"
        footer={
             <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <button 
                    type="submit" 
                    form="template-form"
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all rounded-lg bg-brand-500 hover:bg-brand-600 focus:ring-4 focus:ring-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                        {editingTemplate ? "Update Template" : "Save Template"}
                  </button>
              </div>
        }
      >
          <form id="template-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <Label>Code</Label>
                      <Input 
                        value={formData.code}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                        disabled={!!editingTemplate} 
                        placeholder="e.g. LEAVE_APPROVED"
                        required
                      />
                  </div>
                  <div className="space-y-1">
                      <Label>Name</Label>
                      <Input 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Leave Request Approved"
                        required
                      />
                  </div>
              </div>
              
              <div className="space-y-1">
                  <Label>Subject</Label>
                  <Input 
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="Subject line with {{placeholders}}"
                    required
                  />
              </div>

              <div className="space-y-1">
                  <Label>Body Template</Label>
                  <textarea 
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-transparent text-gray-800 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white dark:focus:border-brand-800 min-h-[150px]"
                    value={formData.bodyTemplate}
                    onChange={e => setFormData({...formData, bodyTemplate: e.target.value})}
                    placeholder="Hello {{name}}, your leave request has been approved."
                    required
                  />
                  <p className="text-xs text-gray-500">Supports {"{{placeholder}}"} syntax.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                      <Label>Channels</Label>
                      <Input 
                        value={formData.notificationChannels}
                        onChange={e => setFormData({...formData, notificationChannels: e.target.value})}
                        placeholder="email, push, database"
                        required
                      />
                  </div>
                  <div 
                      className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-all cursor-pointer hover:border-brand-200 dark:hover:border-brand-500/30 ${
                          formData.isActive 
                              ? 'border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/5' 
                              : 'border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  >
                     <div>
                         <p className="text-sm font-medium text-gray-900 dark:text-white">Active Status</p>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                             {formData.isActive 
                                 ? "Template is active and will be used for notifications." 
                                 : "Template is inactive. No notifications will be sent."}
                         </p>
                     </div>
                     <div className="mt-0.5 pointer-events-none">
                         <Switch 
                             checked={!!formData.isActive} 
                             onChange={() => {}} 
                         />
                     </div>
                  </div>
              </div>
          </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
}
