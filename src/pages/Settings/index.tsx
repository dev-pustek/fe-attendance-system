import React, { useState } from "react";
import { useSettings } from "../../api/hooks/useSettings";
import { CreateSettingDto } from "../../api/services/settingsService";
import { SystemSetting } from "../../api/types/system";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import Modal from "../../components/molecules/Modal";
import { PencilIcon, TrashBinIcon, PlusIcon, GridIcon, ChevronLeftIcon, AngleRightIcon, BoltIcon, ChevronUpIcon, ChevronDownIcon } from "../../components/atoms/Icons";
import { useDebounce } from "../../hooks/useDebounce";
import { showSuccess, showError } from "../../utils/toast";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";

const Settings: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const { confirm, confirmState } = useConfirm();

  const { data: response, isLoading, createMutation, updateMutation, deleteMutation } = useSettings({
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SystemSetting; direction: "asc" | "desc" } | null>(null);
  const [formData, setFormData] = useState<Partial<SystemSetting>>({
    key: "",
    value: "",
    description: "",
  });

  const handleSort = (key: keyof SystemSetting) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedSettings = React.useMemo(() => {
    const data = Array.isArray(response) ? response : (response?.data || []);
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = String(a[key] ?? "");
      const valB = String(b[key] ?? "");
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [response, sortConfig]);

  const SortIcon = ({ column }: { column: keyof SystemSetting }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };
  const total = Number(response?.meta?.total ?? response?.total ?? (Array.isArray(response) ? response.length : 0));
  const totalPages = Number(response?.meta?.totalPages ?? response?.totalPages ?? Math.ceil(total / limit));

  const handleOpenModal = (setting?: SystemSetting) => {
    if (setting) {
      setSelectedSetting(setting);
      setFormData({
        key: setting.key,
        value: setting.value,
        description: setting.description || "",
      });
    } else {
      setSelectedSetting(null);
      setFormData({
        key: "",
        value: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmed = await confirm({
      variant: selectedSetting ? "update" : "create",
      title: selectedSetting ? "Update Setting" : "Create Setting",
      message: `Are you sure you want to ${selectedSetting ? "update" : "create"} the setting "${formData.key}"?`,
    });

    if (!confirmed) return;

    try {
      if (selectedSetting) {
        await updateMutation.mutateAsync({ key: selectedSetting.key, data: { value: formData.value as string } });
        showSuccess(`Setting "${selectedSetting.key}" updated successfully!`);
      } else {
        await createMutation.mutateAsync(formData as CreateSettingDto);
        showSuccess(`Setting "${formData.key}" created successfully!`);
      }
      setIsModalOpen(false);
    } catch (error) {
      showError(error, "Failed to save setting");
    }
  };

  const handleDelete = async (key: string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Setting",
      message: `Are you sure you want to delete the setting "${key}"? This may affect system behavior.`,
    });

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(key);
        showSuccess("Setting deleted successfully!");
      } catch (error) {
        showError(error, "Failed to delete setting");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedKeys(sortedSettings.map((s: SystemSetting) => s.key));
      } else {
          setSelectedKeys([]);
      }
  };

  const handleSelectRow = (key: string) => {
      if (selectedKeys.includes(key)) {
          setSelectedKeys(selectedKeys.filter(selectedKey => selectedKey !== key));
      } else {
          setSelectedKeys([...selectedKeys, key]);
      }
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.length === 0) return;

    const confirmed = await confirm({
        variant: 'delete',
        title: 'Bulk Delete Settings',
        message: `Are you sure you want to permanently delete ${selectedKeys.length} selected settings? This may affect system behavior.`,
        confirmText: `Delete ${selectedKeys.length} Settings`
    });

    if (confirmed) {
        try {
            const promises = selectedKeys.map(key => deleteMutation.mutateAsync(key));
            await Promise.all(promises);
            showSuccess(`Successfully removed ${selectedKeys.length} settings.`);
            setSelectedKeys([]);
        } catch (error) {
            showError(error, "Failed to remove some settings");
        }
    }
  };

  return (
    <>
      <PageMeta title="System Settings | Visia" description="Manage system-wide configuration settings." />
      <PageBreadcrumb pageTitle="Settings" />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Configurations</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage global parameters and system-wide keys.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => window.location.href = '/settings/location'}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            >
              Location Settings
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              <PlusIcon className="fill-white text-xl text-white" />
              Add Setting
            </button>
          </div>
        </div>

        {/* Bulk Selection Actions Bar */}
        {selectedKeys.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm font-mono">
                {selectedKeys.length}
              </div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Settings Selected</p>
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
                    onClick={() => setSelectedKeys([])}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-xs space-y-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Keys</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <GridIcon className="size-4" />
              </div>
              <input
                type="text"
                placeholder="Key or value..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
              />
            </div>
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
                        checked={sortedSettings.length > 0 && selectedKeys.length === sortedSettings.length}
                        onChange={handleSelectAll}
                    />
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                  <button onClick={() => handleSort("key")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Key <SortIcon column="key" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4">
                   <button onClick={() => handleSort("value")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                    Value <SortIcon column="value" />
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</TableCell>
                <TableCell isHeader className="px-5 py-4 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                      <span className="text-sm">Loading settings...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedSettings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-1">
                        <BoltIcon className="size-5 opacity-20" />
                      </div>
                      <p className="text-sm font-medium">No settings found.</p>
                      <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 text-xs text-brand-500 hover:underline">
                        <PlusIcon className="fill-white text-xl text-white" />

                        Add your first setting
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedSettings.map((setting: SystemSetting) => (
                  <TableRow key={setting.key} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <TableCell className="px-5 py-4">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            checked={selectedKeys.includes(setting.key)}
                            onChange={() => handleSelectRow(setting.key)}
                        />
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                          <BoltIcon className="size-4 text-gray-500" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-theme-sm font-mono">{setting.key}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-white/10 dark:text-brand-400">
                        {setting.value}
                      </code>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="text-theme-sm text-gray-500 dark:text-gray-400">{setting.description || "-"}</span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(setting)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(setting.key)}
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

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> settings
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        className="max-w-md"
        title={selectedSetting ? "Update Setting" : "Create New Setting"}
        description="Manage system-wide configuration settings."
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="settings-form"
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-brand-600 shadow-lg shadow-brand-500/20"
            >
              {selectedSetting ? "Update" : "Save"}
            </button>
          </div>
        }
      >
        <form id="settings-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Setting Key</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder="e.g. system_name"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
              required
              disabled={!!selectedSetting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Value</label>
            <input
              type="text"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="Setting value..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this setting for?"
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white resize-none"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default Settings;
