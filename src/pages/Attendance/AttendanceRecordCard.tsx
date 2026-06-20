import React from "react";
import { format, parseISO } from "date-fns";
import Badge from "../../components/atoms/Badge";
import Checkbox from "../../components/atoms/Checkbox";
import {
  CalenderIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  TrashBinIcon,
} from "../../components/atoms/Icons";
import { AttendanceRecord } from "../../api/types/attendance";
import { MethodIcon } from "./AttendanceList";

interface AttendanceRecordCardProps {
  record: AttendanceRecord;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  onQuickCheckOut?: () => void;
  getStatusColor: (statusName?: string) => "success" | "warning" | "error" | "info" | "light";
}

const AttendanceRecordCard: React.FC<AttendanceRecordCardProps> = ({
  record,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
  onViewDetails,
  onQuickCheckOut,
  getStatusColor,
}) => {
  const getDispensasiLabel = (notes?: string | null) => {
    if (!notes) return 'Dispensasi';
    const match = notes.match(/^(?:Excused|Dispensasi):\s*([^(]+)/i);
    return match && match[1] ? match[1].trim() : 'Dispensasi';
  };

  const dispensasiNotes = record.notes || (record.remarks && record.remarks.length > 0 ? record.remarks[0].reason : null);

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isSelected
          ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm"
          : "border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300"
      }`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200 truncate max-w-full">
            {record.user?.studentProfile?.nis || record.user?.public_id?.substring(0,8) || "ID Tidak Diketahui"}
          </span>
          <Badge color={getStatusColor(record.statusLabel || undefined)}>
            {record.statusLabel === 'excused' ? getDispensasiLabel(dispensasiNotes) : (record.status?.name || record.statusLabel || "Tidak Diketahui")}
          </Badge>
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* BODY */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          {record.clockIn && !record.clockOut && (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
            </span>
          )}
          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1">
            {record.user?.name || "Pengguna Tidak Diketahui"}
          </p>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
          {/* Date */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <CalenderIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="font-medium">{format(parseISO(record.date), "dd MMM yyyy")}</span>
          </div>
          {/* Method */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
             <MethodIcon method={record.method || undefined} />
             <span className="font-medium uppercase">{record.method}</span>
          </div>
          
          {/* Time (Clock In -> Clock Out) */}
          <div className="col-span-2 flex items-center gap-1.5 text-xs">
            <span className={record.isLate ? "text-error-600 font-bold" : "text-gray-600 dark:text-gray-400 font-medium"}>
               IN: {record.clockIn ? format(parseISO(record.clockIn), "HH:mm") : "--:--"}
               {record.isLate && ` (${record.lateMinutes}m)`}
            </span>
            <span className="text-gray-300 dark:text-gray-600 px-0.5">—</span>
            <span className={record.isEarlyLeave ? "text-warning-600 font-bold" : "text-gray-600 dark:text-gray-400 font-medium"}>
              OUT: {record.clockOut ? format(parseISO(record.clockOut), "HH:mm") : "--:--"}
              {record.isEarlyLeave && ` (${record.earlyLeaveMinutes}m)`}
            </span>
          </div>
        </div>
        {record.statusLabel === 'excused' && dispensasiNotes && (
          <div className="mt-3 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-2.5">
            <p className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-300">
              <span className="font-semibold block mb-0.5">Keterangan:</span>
              {dispensasiNotes}
            </p>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-3 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
        {onQuickCheckOut && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickCheckOut();
            }}
            className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-brand-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-200 hover:border-brand-300 hover:bg-brand-50 whitespace-nowrap shrink-0 transition-all dark:bg-white/[0.02] dark:border-white/[0.05] dark:text-brand-400 dark:hover:bg-brand-500/10 dark:hover:border-brand-500/30"
          >
            <CheckCircleIcon className="size-3.5 shrink-0" /> Check Out
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-200 hover:border-gray-300 hover:bg-gray-50 whitespace-nowrap shrink-0 transition-all dark:bg-white/[0.02] dark:border-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:border-white/[0.1]"
        >
          <EyeIcon className="size-3.5 shrink-0" /> View
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-200 hover:border-gray-300 hover:bg-gray-50 whitespace-nowrap shrink-0 transition-all dark:bg-white/[0.02] dark:border-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:border-white/[0.1]"
        >
          <PencilIcon className="size-3.5 shrink-0" /> Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-error-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-gray-200 hover:border-error-200 hover:bg-error-50 whitespace-nowrap shrink-0 transition-all dark:bg-white/[0.02] dark:border-white/[0.05] dark:text-error-400 dark:hover:bg-error-500/10 dark:hover:border-error-500/30"
        >
          <TrashBinIcon className="size-3.5 shrink-0" /> Delete
        </button>
      </div>
    </div>
  );
};

export default AttendanceRecordCard;
