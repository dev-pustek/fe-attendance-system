import React from "react";
import Badge from "../../../../components/atoms/Badge";
import Checkbox from "../../../../components/atoms/Checkbox";
import { format, parseISO } from "date-fns";
import { TrashBinIcon, DocsIcon } from "../../../../components/atoms/Icons";

interface ClassCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  record: any;
  isSelected: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}

const getStatusBadge = (status: string) => {
  if (status === 'present' || status === 'on-time') return <Badge color="success">Present</Badge>;
  if (status === 'absent') return <Badge color="error">Absent</Badge>;
  if (status === 'excused') return <Badge color="warning">Excused</Badge>;
  if (status === 'late') return <Badge color="error">Late</Badge>;
  return <Badge color="primary">{status}</Badge>;
};

export default function ClassCard({ record, isSelected, onToggle, onDelete }: ClassCardProps) {
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
             {record.method || 'MANUAL'}
          </Badge>
          {getStatusBadge(record.status || 'present')}
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* Body */}
      <div className="px-4 py-4 sm:px-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
             <DocsIcon className="size-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
               {record.teachingSession?.classSubject?.subject?.name || 'Unknown Subject'}
            </p>
            <p className="text-xs text-gray-500">
               {record.teachingSession?.actualTeacher?.name || 'Unknown Teacher'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-2 pt-2 border-t border-gray-50 dark:border-white/[0.02]">
            <div>
               <p className="text-xs text-gray-500 mb-0.5">Date</p>
               <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {record.teachingSession?.sessionDate ? format(parseISO(record.teachingSession.sessionDate), 'dd MMM yyyy') : '-'}
               </p>
            </div>
            <div className="text-right">
               <p className="text-xs text-gray-500 mb-0.5">Time</p>
               <p className="font-medium text-gray-900 dark:text-white text-sm">
                 {record.teachingSession?.startTime && record.teachingSession?.endTime
                   ? `${record.teachingSession.startTime.slice(0, 5)} - ${record.teachingSession.endTime.slice(0, 5)}`
                   : '-'}
               </p>
            </div>
            <div>
               <p className="text-xs text-gray-500 mb-0.5">Recorded At</p>
               <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {record.recordedAt ? format(parseISO(record.recordedAt), 'HH:mm') : '-'}
               </p>
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
