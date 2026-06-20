import React from 'react';
import { AttendanceRecord } from '../../../api/types/attendance';
import Badge from '../../../components/atoms/Badge';
import Checkbox from '../../../components/atoms/Checkbox';
import { CalenderIcon, TimeIcon, UserIcon } from '../../../components/atoms/Icons';

interface AttendanceReportCardProps {
  entity: AttendanceRecord;
  isSelected: boolean;
  onToggle: () => void;
}

export default function AttendanceReportCard({
  entity,
  isSelected,
  onToggle,
}: AttendanceReportCardProps) {
  const isPresent = entity.isPresent;
  
  // Convert API status to Indonesian label and color
  const getStatusConfig = (status: string, present: boolean, isLate: boolean, notes?: string | null) => {
    if (status === 'excused') {
        const match = notes?.match(/^(?:Excused|Dispensasi):\s*([^(]+)/i);
        const label = match && match[1] ? match[1].trim() : 'Dispensasi';
        return { label, color: 'blue' as const };
    }
    if (!present) return { label: 'Absen', color: 'error' as const };
    if (isLate) return { label: 'Terlambat', color: 'warning' as const };
    return { label: 'Hadir', color: 'success' as const };
  };

  const dispensasiNotes = entity.notes || (entity.remarks && entity.remarks.length > 0 ? entity.remarks[0].reason : null);

  const statusConfig = getStatusConfig(entity.statusLabel || '', isPresent, entity.isLate, dispensasiNotes);

  // Format times safely
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '--:--';
    // If it's a full ISO string
    if (timeStr.includes('T')) {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    // If it's a time string like "08:00:00"
    if (timeStr.includes(':')) {
      return timeStr.slice(0, 5);
    }
    return timeStr;
  };

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isSelected
          ? 'border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm'
          : 'border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300'
      }`}
      onClick={onToggle}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {/* Identify Role/Type if needed, or date */}
          <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200">
            {entity.date}
          </span>
          <Badge color={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onChange={onToggle} />
        </div>
      </div>

      {/* BODY */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <UserIcon className="size-4 shrink-0 text-gray-400" />
          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
            {entity.studentName || entity.user?.name || entity.user?.full_name || 'Unknown User'}
          </p>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <CalenderIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span>Kelas: <span className="font-medium text-gray-700 dark:text-gray-300">{entity.className || entity.class?.name || '-'}</span></span>
          </div>
          <div className="flex items-center gap-4 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <TimeIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
              <span>In: <span className="font-medium text-gray-700 dark:text-gray-300">{formatTime(entity.clockIn)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <TimeIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
              <span>Out: <span className="font-medium text-gray-700 dark:text-gray-300">{formatTime(entity.clockOut)}</span></span>
              {entity.isEarlyLeave && <span className="text-warning-600 font-bold ml-1">(-{entity.earlyLeaveMinutes}m)</span>}
              {entity.isOvertime && <span className="text-success-600 font-bold ml-1">(+{entity.overtimeMinutes}m)</span>}
            </div>
          </div>
          {entity.statusLabel === 'excused' && dispensasiNotes && (
            <div className="mt-2 bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-2.5">
              <p className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-300">
                <span className="font-semibold block mb-0.5">Keterangan Dispensasi:</span>
                {dispensasiNotes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
