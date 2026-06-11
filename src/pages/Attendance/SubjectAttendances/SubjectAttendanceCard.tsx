import React from "react";
import { SubjectAttendance } from "../../../api/types/attendance";
import Checkbox from "../../../components/atoms/Checkbox";
import Badge from "../../../components/atoms/Badge";
import { 
  PencilIcon, 
  TrashBinIcon, 
  CalenderIcon,
  TimeIcon,
  CheckCircleIcon
} from "../../../components/atoms/Icons";
import { format } from "date-fns";

interface SubjectAttendanceCardProps {
  attendance: SubjectAttendance;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const getStatusConfig = (status: SubjectAttendance["status"]) => {
  switch (status?.toLowerCase()) {
    case "present":
      return { color: "success" as const, text: "Present" };
    case "late":
      return { color: "warning" as const, text: "Late" };
    case "absent":
      return { color: "error" as const, text: "Absent" };
    case "excused":
      return { color: "info" as const, text: "Excused" };
    case "sick":
      return { color: "info" as const, text: "Sick" };
    default:
      return { color: "light" as const, text: status || "Unknown" };
  }
};

const SubjectAttendanceCard: React.FC<SubjectAttendanceCardProps> = ({
  attendance,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const statusConfig = getStatusConfig(attendance.status);

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
          {/* Method Pill */}
          <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200 uppercase">
            {attendance.method || "manual"}
          </span>
          {/* Status Badge */}
          <Badge color={statusConfig.color}>{statusConfig.text}</Badge>
        </div>
        {/* Checkbox */}
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* BODY */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          {attendance.status === "present" && <CheckCircleIcon className="size-4 shrink-0 text-success-500" />}
          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight truncate">
            {attendance.student?.name || "Unknown Student"}
          </p>
        </div>
        
        {/* Meta info */}
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <CalenderIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="font-medium truncate">
              {attendance.teachingSession?.sessionDate || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <TimeIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="font-medium truncate">
              {attendance.teachingSession?.startTime?.slice(0, 5)}–{attendance.teachingSession?.endTime?.slice(0, 5)}
            </span>
          </div>
        </div>

        {/* Remarks */}
        {attendance.remarks && (
          <div className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-400">
            <span className="font-semibold mr-1 text-gray-700 dark:text-gray-300">Notes:</span>
            {attendance.remarks}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
        >
          <PencilIcon className="size-3.5" /> Edit
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
        >
          <TrashBinIcon className="size-3.5" /> Delete
        </button>
      </div>
    </div>
  );
};

export default SubjectAttendanceCard;
