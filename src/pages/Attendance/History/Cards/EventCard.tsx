import React from "react";
import Badge from "../../../../components/atoms/Badge";
import Checkbox from "../../../../components/atoms/Checkbox";
import { format, parseISO } from "date-fns";
import { AlertIcon, TimeIcon } from "../../../../components/atoms/Icons";

interface EventCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any;
  isSelected: boolean;
  onToggle: () => void;
  // Events might not have a direct delete action in history right now, but optional
  onDelete?: () => void;
}

const getStatusBadge = (status: string, isLate?: boolean) => {
  if (isLate) return <Badge color="error">Late</Badge>;
  if (status === 'present' || status === 'on-time') return <Badge color="success">Present</Badge>;
  if (status === 'absent') return <Badge color="error">Absent</Badge>;
  if (status === 'excused') return <Badge color="warning">Excused</Badge>;
  return <Badge color="primary">{status}</Badge>;
};

export default function EventCard({ record, isSelected, onToggle, onDelete }: EventCardProps) {
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
             {record.event?.eventType || 'event'}
          </Badge>
          {record.attendanceStatus?.hasAttended
              ? getStatusBadge(record.attendanceStatus.status, record.attendanceStatus.isLate)
              : <Badge color="warning">Not Attended</Badge>}
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* Body */}
      <div className="px-4 py-4 sm:px-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 w-full">
              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
                 {record.event?.name || '-'}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                 {record.event?.startTime ? format(parseISO(record.event.startTime), 'dd MMM yyyy') : '-'}
              </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-gray-50 dark:border-white/[0.02]">
            <div className="col-span-2">
               <p className="text-xs text-gray-500 mb-0.5">Location & Schedule</p>
               <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                     <AlertIcon className="size-3 text-gray-400" />
                     <span className="text-sm font-medium">{record.event?.location || 'No location set'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                     <TimeIcon className="size-3" />
                     <span className="text-xs font-medium">
                        {record.event?.startTime ? format(parseISO(record.event.startTime), 'HH:mm') : '--:--'}
                        {' - '}
                        {record.event?.endTime ? format(parseISO(record.event.endTime), 'HH:mm') : '--:--'}
                     </span>
                  </div>
               </div>
            </div>

            <div className="col-span-2 mt-2 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-white/5">
               <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance Status</p>
                  <span className="text-[10px] font-bold text-gray-400 italic">Invited: {record.status || '-'}</span>
               </div>
               {record.attendanceStatus?.hasAttended ? (
                  <div className="flex gap-4">
                     <div className="flex-1">
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-tighter">Clock In</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                           {record.attendanceStatus.clockIn ? format(parseISO(record.attendanceStatus.clockIn), 'HH:mm:ss') : '--:--'}
                        </p>
                     </div>
                     <div className="w-px bg-gray-200 dark:bg-white/10"></div>
                     <div className="flex-1 text-right">
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-tighter">Clock Out</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                           {record.attendanceStatus.clockOut ? format(parseISO(record.attendanceStatus.clockOut), 'HH:mm:ss') : '--:--'}
                        </p>
                     </div>
                  </div>
               ) : (
                  <p className="text-xs text-gray-400 italic py-1">No attendance recorded</p>
               )}
               {record.responseNotes && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
                     <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Response Note</p>
                     <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{record.responseNotes}"</p>
                  </div>
               )}
            </div>
        </div>
      </div>

      {/* Footer */}
      {onDelete && (
        <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10">
            <TrashBinIcon className="size-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
