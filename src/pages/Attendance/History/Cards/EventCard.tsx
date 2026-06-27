import React from "react";
import Badge from "../../../../components/atoms/Badge";
import Checkbox from "../../../../components/atoms/Checkbox";
import { format, parseISO } from "date-fns";
import { MapPinIcon, TrashBinIcon } from "../../../../components/atoms/Icons";

interface EventCardProps {
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

export default function EventCard({ record, isSelected, onToggle, onDelete, onViewDetails }: EventCardProps) {
  const eventType = record.event?.eventType || "EVENT";

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
             {eventType}
          </Badge>
          {record.attendanceStatus?.hasAttended
              ? getStatusBadge(record.attendanceStatus.status, record.attendanceStatus.isLate)
              : <Badge color="warning">Tidak Hadir</Badge>}
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* Body */}
      <div className="px-4 py-4 sm:px-5 space-y-3">
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">
             {record.event?.name || 'Acara Tidak Diketahui'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
             <MapPinIcon className="size-3.5" />
             <span>{record.event?.location || 'Tidak ada lokasi'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-gray-50 dark:border-white/[0.02]">
            <div className="col-span-2">
               <p className="text-xs text-gray-500 mb-0.5">Jadwal</p>
               <p className="font-medium text-gray-900 dark:text-white text-sm">
                 {record.event?.startTime ? format(parseISO(record.event.startTime), 'dd MMM yy HH:mm') : '-'}
                 {' hingga '}
                 {record.event?.endTime ? format(parseISO(record.event.endTime), 'HH:mm') : '-'}
               </p>
            </div>
            <div className="flex gap-4 col-span-2 mt-1 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
               <div className="flex-1">
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase">Masuk</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                     {record.attendanceStatus?.clockIn ? format(parseISO(record.attendanceStatus.clockIn), 'HH:mm') : '--:--'}
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
