import React, { useState, useEffect, useMemo } from "react";
import { useBackups, useBackupSettings } from "../../api/hooks/useBackups";
import { backupService } from "../../api/services/backupService";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import { Backup } from "../../api/types/backup";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/atoms/Table";
import { TrashBinIcon, DownloadIcon, BoltIcon, TimeIcon, CheckCircleIcon, CalenderIcon } from "../../components/atoms/Icons";
import { showSuccess, showError } from "../../utils/toast";
import ConfirmDialog from "../../components/molecules/ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import CustomSelect from "../../components/molecules/CustomSelect";

const Backups: React.FC = () => {
  const { backups, isLoading: isBackupsLoading, triggerBackup, isTriggering, deleteBackup } = useBackups();
  const { settings, updateSettings, isUpdating } = useBackupSettings();
  const { confirm, confirmState } = useConfirm();
  
  // Schedule state
  const [frequency, setFrequency] = useState("daily");
  const [backupTime, setBackupTime] = useState("00:00");
  const [dayOfWeek, setDayOfWeek] = useState("1"); // 1 = Monday
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [retentionDays, setRetentionDays] = useState(7);

  // Parse cron string to UI state
  useEffect(() => {
    if (settings?.schedule) {
      const parts = settings.schedule.split(" ");
      if (parts.length >= 5) {
        const [m, h, dom, , dow] = parts;
        setBackupTime(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`);
        
        if (dow !== "*") {
          setFrequency("weekly");
          setDayOfWeek(dow);
        } else if (dom !== "*") {
          setFrequency("monthly");
          setDayOfMonth(dom);
        } else {
          setFrequency("daily");
        }
      }
    }
    if (settings?.retentionDays) {
      setRetentionDays(settings.retentionDays);
    }
  }, [settings]);

  // Generate cron from UI state
  const generatedCron = useMemo(() => {
    const [hStr, mStr] = backupTime.split(":");
    const h = parseInt(hStr) || 0;
    const m = parseInt(mStr) || 0;
    
    if (frequency === "weekly") {
      return `${m} ${h} * * ${dayOfWeek}`;
    } else if (frequency === "monthly") {
      return `${m} ${h} ${dayOfMonth} * *`;
    }
    return `${m} ${h} * * *`;
  }, [frequency, backupTime, dayOfWeek, dayOfMonth]);

  const handleTriggerBackup = async () => {
    const confirmed = await confirm({
      variant: "create",
      title: "Trigger Manual Backup",
      message: "Are you sure you want to start a manual database backup now?",
    });

    if (confirmed) {
      triggerBackup(undefined, {
        onSuccess: () => showSuccess("Backup triggered successfully!"),
        onError: () => showError("Failed to trigger backup."),
      });
    }
  };

  const handleDelete = async (filename: string) => {
    const confirmed = await confirm({
      variant: "delete",
      title: "Delete Backup",
      message: `Are you sure you want to permanently delete "${filename}"?`,
    });

    if (confirmed) {
      deleteBackup(filename, {
        onSuccess: () => showSuccess("Backup deleted successfully."),
        onError: () => showError("Failed to delete backup."),
      });
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = await confirm({
      variant: "update",
      title: "Update Backup Policy",
      message: "Save changes to the automated backup schedule and retention policy?",
    });

    if (confirmed) {
      updateSettings({ schedule: generatedCron, retentionDays }, {
        onSuccess: () => showSuccess("Backup policy updated successfully."),
        onError: () => showError("Failed to update settings."),
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const weekDays = [
    { label: "Sunday", value: "0" },
    { label: "Monday", value: "1" },
    { label: "Tuesday", value: "2" },
    { label: "Wednesday", value: "3" },
    { label: "Thursday", value: "4" },
    { label: "Friday", value: "5" },
    { label: "Saturday", value: "6" },
  ];

  return (
    <div className="space-y-6">
      <PageMeta title="System Backups - Settings" description="Manage database backups and automated tasks." />
      <PageBreadcrumb pageTitle="System Backups" />

      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.05] shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="size-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500">
             <CheckCircleIcon className="size-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Archived</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
              {isBackupsLoading ? "..." : backups.length}
            </p>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.05] shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="size-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
             <TimeIcon className="size-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Retention Life</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
              {(isBackupsLoading || !settings) ? "..." : `${settings.retentionDays} Days`}
            </p>
          </div>
        </div>

        <button 
          onClick={handleTriggerBackup}
          disabled={isTriggering}
          className="group relative p-6 bg-brand-500 hover:bg-brand-600 text-white rounded-3xl shadow-xl shadow-brand-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <BoltIcon className={`size-6 relative z-10 ${isTriggering ? 'animate-pulse' : ''}`} />
          <span className="font-bold relative z-10">Run Manual Backup</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Backup List - Standard Table */}
        <div className="lg:col-span-3 bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.05] flex flex-col shadow-sm">
          <div className="p-6 border-b border-gray-100 dark:border-white/[0.05] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white leading-tight">Backup History</h3>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-medium">Path: {settings?.backupPath || './backups'}</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell isHeader className="px-6 py-4 text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">File Name</TableCell>
                  <TableCell isHeader className="px-6 py-4 text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</TableCell>
                  <TableCell isHeader className="px-6 py-4 text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created At</TableCell>
                  <TableCell isHeader align="right" className="px-6 py-4 text-theme-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isBackupsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" className="py-24">
                       <div className="flex flex-col items-center gap-3">
                         <div className="size-8 animate-spin rounded-full border-3 border-brand-500 border-t-transparent"></div>
                         <span className="text-sm font-medium text-gray-400">Loading archives...</span>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" className="py-24">
                      <div className="flex flex-col items-center gap-3">
                        <div className="size-16 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                          <DownloadIcon className="size-8 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">Vault is currently empty.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup: Backup) => (
                    <TableRow key={backup.filename} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400">
                             <CalenderIcon className="size-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[180px]" title={backup.filename}>{backup.filename}</span>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter leading-none">{backup.type} snapshot</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                         <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatSize(backup.size)}</span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-xs text-gray-400">
                          {new Date(backup.mtime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </TableCell>
                      <TableCell align="right" className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <a 
                            href={backupService.getDownloadUrl(backup.filename)}
                            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-brand-500/10"
                            title="Download Archive"
                          >
                            <DownloadIcon className="size-4" />
                          </a>
                          <button 
                            onClick={() => handleDelete(backup.filename)}
                            className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                            title="Purge File"
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
        </div>

        {/* Simplified Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-white/[0.03] rounded-3xl border border-gray-200 dark:border-white/[0.05] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Automation Policy</h3>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <CustomSelect 
                label="Backup Frequency"
                value={frequency}
                onChange={(val) => setFrequency(String(val))}
                options={[
                  { label: "Daily (Every Day)", value: "daily" },
                  { label: "Weekly (Every Week)", value: "weekly" },
                  { label: "Monthly (Every Month)", value: "monthly" },
                ]}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Execution Time</label>
                <input 
                  type="time"
                  value={backupTime}
                  onChange={(e) => setBackupTime(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                />
              </div>

              {frequency === "weekly" && (
                <CustomSelect 
                  label="Run on specific day"
                  value={dayOfWeek}
                  onChange={(val) => setDayOfWeek(String(val))}
                  options={weekDays}
                />
              )}

              {frequency === "monthly" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Day of the Month (1-31)</label>
                  <input 
                    type="number"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    min={1} max={31}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] text-sm focus:ring-2 focus:ring-brand-500/20 outline-none"
                  />
                </div>
              )}

              <hr className="border-gray-100 dark:border-white/[0.05]" />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Retention Threshold (Days)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    min={1} max={365}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] text-sm focus:ring-2 focus:ring-brand-500/20 outline-none pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Days</span>
                </div>
              </div>

              <div className="p-4 bg-brand-50 dark:bg-brand-500/5 rounded-2xl border border-brand-100 dark:border-brand-500/10">
                 <div className="flex items-start gap-3">
                    <TimeIcon className="size-4 text-brand-500 mt-0.5" />
                    <div className="space-y-1">
                       <p className="text-xs font-bold text-brand-600 dark:text-brand-400">Generated Schedule Preview</p>
                       <p className="text-[11px] text-brand-500/70 font-mono tracking-wider">{generatedCron} (Cron Expression)</p>
                    </div>
                 </div>
              </div>

              <button 
                type="submit"
                disabled={isUpdating}
                className="w-full h-12 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-500/20"
              >
                {isUpdating ? "Saving Policy..." : "Update Backup Policy"}
              </button>
            </form>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-white/[0.01] rounded-3xl border border-dashed border-gray-200 dark:border-white/[0.05]">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
              <ShieldCheckIcon className="size-3 text-brand-500" /> Security Tip
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
              Archived files are stored securely on the server. We recommend downloading critical snapshots weekly for off-site redundant storage. Retention policies help control disk space usage automatically.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog {...confirmState} />
    </div>
  );
};

// Simple Shield Icon for the tip
const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export default Backups;
