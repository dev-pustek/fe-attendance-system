import React from "react";
import { format } from "date-fns";
import { TeachingSession } from "../../../api/types/attendance";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";
import { PencilIcon, TrashBinIcon, CalenderIcon, TimeIcon, UserIcon } from "../../../components/atoms/Icons";

interface TeachingSessionCardProps {
  entity: TeachingSession;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TeachingSessionCard: React.FC<TeachingSessionCardProps> = ({
  entity,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy");
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    try {
      // Assuming timeString is HH:mm or HH:mm:ss
      const [hours, minutes] = timeString.split(":");
      return `${hours}:${minutes}`;
    } catch {
      return timeString;
    }
  };

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
        <div className="flex items-center gap-2">
          {/* Main Identifier Pill */}
          <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200">
            {entity.classSubject?.class?.name || "Kelas N/A"}
          </span>
          {/* Status Badge */}
          <Badge color={entity.isCancelled ? "error" : "success"}>
            {entity.isCancelled ? "Dibatalkan" : "Aktif"}
          </Badge>
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* BODY */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
              {entity.classSubject?.subject?.name || "Mata Pelajaran N/A"}
            </p>
            <div className="mt-1 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <UserIcon className="size-3.5 shrink-0" />
                <span className="font-medium">{entity.actualTeacher?.name || "Tidak Diketahui"}</span>
              </div>
              {entity.isSubstitution && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                  <span>Pengganti untuk {entity.substituteForTeacher?.name || "Tidak Ada"}</span>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex py-1 px-2.5 rounded-lg bg-gray-50 dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-300">
              {entity.teachingUnits} Unit
            </span>
          </div>
        </div>
        
        {/* Date and Time Info */}
        <div className="mt-3 flex items-center gap-3 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 p-2 rounded-lg dark:bg-white/[0.02]">
          <div className="flex items-center gap-1.5">
            <CalenderIcon className="size-3.5 shrink-0 text-brand-500 dark:text-brand-400" />
            <span className="font-medium">{formatDate(entity.sessionDate)}</span>
          </div>
          <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.1]" />
          <div className="flex items-center gap-1.5">
            <TimeIcon className="size-3.5 shrink-0 text-brand-500 dark:text-brand-400" />
            <span className="font-medium">
              {formatTime(entity.startTime)} - {formatTime(entity.endTime)}
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04] transition-colors"
        >
          <PencilIcon className="size-3.5" /> Edit
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 transition-colors"
        >
          <TrashBinIcon className="size-3.5" /> Hapus
        </button>
      </div>
    </div>
  );
};

export default TeachingSessionCard;
