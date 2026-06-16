import React from "react";
import { Major } from "../../../api/types/academic";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";
import {
  PencilIcon,
  TrashBinIcon,
  InfoIcon as MajorIcon,
  DocsIcon,
} from "../../../components/atoms/Icons";

interface MajorCardProps {
  entity: Major;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const MajorCard: React.FC<MajorCardProps> = ({
  entity,
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
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200">
            {entity.code}
          </span>
          <Badge color={entity.isActive ? "success" : "light"}>
            {entity.isActive ? "Aktif" : "Tidak Aktif"}
          </Badge>
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* BODY */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <MajorIcon className={`size-4 shrink-0 ${entity.isActive ? "text-brand-500" : "text-gray-400"}`} />
          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
            {entity.name}
          </p>
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <DocsIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="font-medium">Tingkat: {entity.educationLevel?.name || "-"}</span>
            <span className="text-gray-300 dark:text-gray-600 px-0.5">—</span>
            <span className="font-medium">Program: {entity.programStudy?.name || "-"}</span>
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
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
        >
          <PencilIcon className="size-3.5" /> Ubah
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
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

export default MajorCard;
