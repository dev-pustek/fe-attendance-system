import React from "react";
import { ProgramStudy } from "../../../api/types/academic";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";
import {
  PencilIcon,
  TrashBinIcon,
  CheckCircleIcon,
  InfoIcon as ProgramIcon,
} from "../../../components/atoms/Icons";

interface ProgramStudyCardProps {
  entity: ProgramStudy;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProgramStudyCard: React.FC<ProgramStudyCardProps> = ({
  entity,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all ${
        isSelected
          ? "border-brand-300 bg-brand-50/60 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/5"
          : "border-gray-200 bg-white shadow-sm hover:border-gray-300 dark:border-white/[0.06] dark:bg-white/[0.02]"
      }`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {/* Code Pill */}
          <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200">
            {entity.code}
          </span>
          {/* Status Badge */}
          <Badge color={entity.isActive ? "success" : "light"}>
            {entity.isActive ? "Aktif" : "Tidak Aktif"}
          </Badge>
        </div>
        {/* Checkbox */}
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* BODY */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          {entity.isActive && (
            <CheckCircleIcon className="size-4 shrink-0 text-success-500" />
          )}
          <p className="font-semibold leading-tight text-gray-900 sm:text-base dark:text-white text-sm">
            {entity.name}
          </p>
        </div>
        {/* Additional meta info */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 sm:text-xs dark:text-gray-400">
          <ProgramIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
          <span className="font-medium">
            Tingkat Pendidikan: {entity.educationLevel?.name || "-"}
          </span>
        </div>
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
        <div className="mx-1 h-4 w-px bg-gray-200 dark:bg-white/[0.06]" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
        >
          <TrashBinIcon className="size-3.5" /> Hapus
        </button>
      </div>
    </div>
  );
};

export default ProgramStudyCard;
