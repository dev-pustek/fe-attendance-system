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
}

const getStatusBadge = (status: string, isLate?: boolean) => {
  if (isLate) return <Badge color="error">Late</Badge>;
  if (status === 'present' || status === 'on-time') return <Badge color="success">Present</Badge>;
  if (status === 'absent') return <Badge color="error">Absent</Badge>;
  if (status === 'excused') return <Badge color="warning">Excused</Badge>;
  return <Badge color="primary">{status}</Badge>;
};

export default function GateCard({ record, isSelected, onToggle, onDelete }: GateCardProps) {
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
              {record.user?.name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500">{identifier}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-gray-50 dark:border-white/[0.02]">
            <div className="col-span-2">
               <p className="text-xs text-gray-500 mb-0.5">Date</p>
               <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {record.date ? format(parseISO(record.date), 'dd MMM yyyy') : '-'}
               </p>
            </div>
            <div className="flex gap-4 col-span-2 mt-1 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
               <div className="flex-1">
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase">Clock In</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                     {record.clockIn ? format(parseISO(record.clockIn), 'HH:mm') : '--:--'}
                  </p>
               </div>
               <div className="w-px bg-gray-200 dark:bg-white/10"></div>
               <div className="flex-1 text-right">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Clock Out</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                     {record.clockOut ? format(parseISO(record.clockOut), 'HH:mm') : '--:--'}
                  </p>
               </div>
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
