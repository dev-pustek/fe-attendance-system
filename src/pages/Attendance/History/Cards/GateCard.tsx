import React from "react";
import Badge from "../../../../components/atoms/Badge";
import Checkbox from "../../../../components/atoms/Checkbox";
import Avatar from "../../../../components/atoms/Avatar";
import { format, parseISO } from "date-fns";
import { TrashBinIcon } from "../../../../components/atoms/Icons";

interface GateCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any;
  isSelected: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
}

const getStatusBadge = (status: string, isLate?: boolean) => {
  if (isLate) return <Badge color="error">Terlambat</Badge>;
  if (status === 'present' || status === 'on-time') return <Badge color="success">Hadir</Badge>;
  if (status === 'absent') return <Badge color="error">Tidak Hadir</Badge>;
  if (status === 'excused') return <Badge color="warning">Izin</Badge>;
  return <Badge color="primary">{status}</Badge>;
};

export default function GateCard({ record, isSelected, onToggle, onDelete, onViewDetails }: GateCardProps) {
  const isStudent = record.user?.role === 'student' || record.studentProfile;
  const identifier = isStudent 
    ? (record.studentProfile?.nis || record.user?.profile?.nis || '-') 
    : (record.user?.email || record.userId);

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isSelected
        ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm"
        : "border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Badge color="light" size="sm" className="uppercase tracking-wider font-semibold">
             {record.method?.replace('_', ' ') || 'MANUAL'}
          </Badge>
          {getStatusBadge(record.statusLabel || record.status?.name || 'present', record.isLate)}
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* Body */}
      <div className="px-4 py-4 sm:px-5 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar src={record.user?.photo || record.user?.profile?.photo} alt={record.user?.name} size="small" />
          <div>
            <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
              {record.user?.name || 'Tidak Diketahui'}
            </p>
            <p className="text-xs text-gray-500">{identifier}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-gray-50 dark:border-white/[0.02]">
            <div className="col-span-2">
               <p className="text-xs text-gray-500 mb-0.5">Tanggal</p>
               <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {record.date ? format(parseISO(record.date), 'dd MMM yyyy') : '-'}
               </p>
            </div>
            <div className="flex gap-4 col-span-2 mt-1 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
               <div className="flex-1">
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase">Masuk</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                     {record.clockIn ? format(parseISO(record.clockIn), 'HH:mm') : '--:--'}
                  </p>
               </div>
               <div className="w-px bg-gray-200 dark:bg-white/10"></div>
               <div className="flex-1 text-right">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Keluar</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                     {record.clockOut ? format(parseISO(record.clockOut), 'HH:mm') : '--:--'}
                     {record.isEarlyLeave && <span className="text-xs text-warning-600 ml-1">(-{record.earlyLeaveMinutes}m)</span>}
                  </p>
               </div>
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
        {onViewDetails && (
          <button onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Lihat Detail
          </button>
        )}
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10">
            <TrashBinIcon className="size-3.5" /> Hapus
          </button>
        )}
      </div>
    </div>
  );
}
