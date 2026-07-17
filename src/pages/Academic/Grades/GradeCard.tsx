import React from "react";
import { Grade } from "../../../api/types/academic";
import Checkbox from "../../../components/atoms/Checkbox";
import { PencilIcon, TrashBinIcon, InfoIcon as GradeIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";

interface GradeCardProps {
  grade: Grade;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const GradeCard: React.FC<GradeCardProps> = ({
  grade,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isSelected
          ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm"
          : "border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200">
            {grade.code}
          </span>
          {grade.educationLevel && (
            <Badge color="light">{grade.educationLevel.name}</Badge>
          )}
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* Card Body */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 shrink-0">
            <GradeIcon className="size-3.5" />
          </div>
          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
            {grade.name}
          </p>
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
        >
          <PencilIcon className="size-3.5" /> Ubah
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
        >
          <TrashBinIcon className="size-3.5" /> Hapus
        </button>
      </div>
    </div>
  );
};

export default GradeCard;
