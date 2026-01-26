import React, { useState } from "react";
import { useAuditLogs } from "../../api/hooks/useAudit";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/atoms/Table";
import Badge from "../../components/atoms/Badge";
import PageMeta from "../../components/atoms/PageMeta";
import Modal from "../../components/molecules/Modal";
import CustomSelect from "../../components/molecules/CustomSelect";
import { AuditLog } from "../../api/types/system";
import { CopyIcon, ChevronLeftIcon, AngleRightIcon, PageIcon, ChevronUpIcon, ChevronDownIcon, TrashBinIcon } from "../../components/atoms/Icons";
import { useDebounce } from "../../hooks/useDebounce";
import { useDeleteAuditLog } from "../../api/hooks/useAudit";
import { showSuccess, showError } from "../../utils/toast";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";

const AuditLogs: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof AuditLog; direction: "asc" | "desc" } | null>(null);
  const [copied, setCopied] = useState(false);

  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);
  const { confirm, confirmState } = useConfirm();
  const { mutateAsync: deleteAuditLog } = useDeleteAuditLog();

  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: paginatedData, isLoading, error } = useAuditLogs({ 
    page, 
    limit, 
    action: actionFilter || undefined,
    statusCode: statusFilter || undefined,
    search: debouncedSearch || undefined
  });
  const handleSort = (key: keyof AuditLog) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedLogs = React.useMemo(() => {
    const data = paginatedData?.data || [];
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valA = String(a[key] ?? "");
      const valB = String(b[key] ?? "");
      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [paginatedData, sortConfig]);

  const SortIcon = ({ column }: { column: keyof AuditLog }) => {
    if (sortConfig?.key !== column) return <div className="size-3 opacity-20"><ChevronUpIcon /></div>;
    return sortConfig.direction === "asc" ? (
      <ChevronUpIcon className="size-3 text-brand-500" />
    ) : (
      <ChevronDownIcon className="size-3 text-brand-500" />
    );
  };

  const total = paginatedData?.meta?.total || 0;
  const totalPages = paginatedData?.meta?.totalPages || Math.ceil(total / (limit || 1));

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "success";
    if (statusCode >= 400 && statusCode < 500) return "warning";
    return "error";
  };

  const handleCopyJson = (json: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(sortedLogs.map(l => l.id));
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

    const confirmed = await confirm({
        variant: 'delete',
        title: 'Bulk Delete Audit Logs',
        message: `Are you sure you want to permanently delete ${selectedIds.length} selected audit logs? This action cannot be undone.`,
        confirmText: `Delete ${selectedIds.length} Logs`
    });

    if (confirmed) {
        try {
            const promises = selectedIds.map(id => deleteAuditLog(id));
            await Promise.all(promises);
            showSuccess(`Successfully removed ${selectedIds.length} audit logs.`);
            setSelectedIds([]);
        } catch (error) {
            showError(error, "Failed to remove some audit logs");
        }
    }
  };

  return (
    <>
      <PageMeta
        title="Audit Logs | Visia"
        description="Comprehensive system activity and user action logs."
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track all system-level activities and user mutations.
            </p>
          </div>
        </div>

        {/* Bulk Selection Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-500/10 dark:border-brand-500/20 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shadow-sm font-mono">
                {selectedIds.length}
              </div>
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Logs Selected</p>
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
                    onClick={() => setSelectedIds([])}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                    Cancel
                </button>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Search Logs</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by IP, resource..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            <CustomSelect
              label="Action Type"
              value={actionFilter}
              onChange={(val) => { setActionFilter(String(val)); setPage(1); }}
              options={[
                { label: "All Actions", value: "" },
                { label: "POST (Create)", value: "POST" },
                { label: "PUT (Update)", value: "PUT" },
                { label: "PATCH (Partial)", value: "PATCH" },
                { label: "DELETE (Remove)", value: "DELETE" },
              ]}
            />

            <CustomSelect
              label="HTTP Status"
              value={statusFilter}
              onChange={(val) => { setStatusFilter(String(val)); setPage(1); }}
              options={[
                { label: "All Statuses", value: "" },
                { label: "200 Success", value: "200" },
                { label: "201 Created", value: "201" },
                { label: "400 Bad Request", value: "400" },
                { label: "401 Unauthorized", value: "401" },
                { label: "403 Forbidden", value: "403" },
                { label: "404 Not Found", value: "404" },
                { label: "500 Server Error", value: "500" },
              ]}
            />

            <CustomSelect
              label="Rows per Page"
              value={limit}
              onChange={(val) => { setLimit(Number(val)); setPage(1); }}
              options={[
                { label: "10 rows", value: 10 },
                { label: "20 rows", value: 20 },
                { label: "50 rows", value: 50 },
                { label: "100 rows", value: 100 },
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-4 w-12">
                      <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          checked={sortedLogs.length > 0 && selectedIds.length === sortedLogs.length}
                          onChange={handleSelectAll}
                      />
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("id")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      ID <SortIcon column="id" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("action")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      Action <SortIcon column="action" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("resource")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      Resource <SortIcon column="resource" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("statusCode")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      Status <SortIcon column="statusCode" />
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4">
                    <button onClick={() => handleSort("createdAt")} className="flex items-center gap-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors uppercase tracking-wider">
                      Date <SortIcon column="createdAt" />
                    </button>
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-10 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                        <span>Loading logs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-10 text-center text-error-500">
                      Error loading logs. Please check your connection or search terms.
                    </TableCell>
                  </TableRow>
                ) : sortedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-10">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <PageIcon className="mb-2 size-8 opacity-20" />
                        <p>No audit logs found matching your criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLogs.map((log) => (
                    <TableRow key={log.id} className="group cursor-pointer transition-colors hover:bg-gray-50/50 dark:hover:bg-white/[0.01]" onClick={() => setSelectedLog(log)}>
                      <TableCell className="px-5 py-4">
                          <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                              checked={selectedIds.includes(log.id)}
                              onChange={(e) => { e.stopPropagation(); handleSelectRow(log.id); }}
                              onClick={(e) => e.stopPropagation()}
                          />
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        #{String(log.id).slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge size="sm" color={log.action === "DELETE" ? "error" : log.action === "POST" ? "success" : "info"}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                        {log.resource}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge size="sm" color={getStatusColor(log.statusCode)}>
                          {log.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col">
                          <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                          <span className="text-[10px] opacity-60">{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-white">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-medium text-gray-700 dark:text-white">{Math.min(page * limit, total)}</span> of{" "}
              <span className="font-medium text-gray-700 dark:text-white">{total}</span> logs
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(1, p - 1)); }}
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
                onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages, p + 1)); }}
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

      {/* Log Detail Modal */}
      <Modal 
        isOpen={!!selectedLog} 
        onClose={() => setSelectedLog(null)}
        title="Log Trail"
        className="max-w-4xl"
        description={`Detailed execution context for trace #${selectedLog?.id ? String(selectedLog.id).slice(-6).toUpperCase() : ""}`}
        footer={
          <div className="flex justify-end">
            <button 
              onClick={() => setSelectedLog(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="p-1">

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-400">Operation</h3>
                <div className="flex items-center gap-3">
                  <Badge color={selectedLog?.action === "DELETE" ? "error" : "success"} size="md" className="px-3 py-1 font-bold">{selectedLog?.action}</Badge>
                  <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{selectedLog?.resource}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-400">Result</h3>
                  <Badge color={getStatusColor(selectedLog?.statusCode || 0)} className="font-bold">{selectedLog?.statusCode}</Badge>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-400">Timestamp</h3>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedLog && new Date(selectedLog.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-400">Environment</h3>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-800 dark:text-white">Origin:</span> {selectedLog?.ipAddress || "Internal System"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-800 dark:text-white">User Agent:</span> {selectedLog?.userAgent}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-gray-400">Execution Payload</h3>
                  <button 
                    onClick={() => handleCopyJson(selectedLog?.changes)}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-500 transition-colors hover:text-brand-600"
                  >
                    <CopyIcon className="size-4" />
                    {copied ? "Copied Trace" : "Copy Payload"}
                  </button>
                </div>
                <div className="max-h-[400px] overflow-auto rounded-2xl bg-[#0F172A] p-5 font-mono text-xs leading-relaxed text-emerald-400 shadow-inner">
                  <pre className="whitespace-pre-wrap break-all">{JSON.stringify(selectedLog?.changes || {}, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      
      <ConfirmDialog {...confirmState} />
    </>
  );
};

export default AuditLogs;
