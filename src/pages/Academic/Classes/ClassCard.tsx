import React from "react";
import { Class } from "../../../api/types/academic";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";
import { 
    PencilIcon, 
    TrashBinIcon, 
    UserIcon,
    MapPinIcon,
    GroupIcon
} from "../../../components/atoms/Icons";

interface ClassCardProps {
    classData: Class;
    isSelected: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({
    classData,
    isSelected,
    onToggle,
    onEdit,
    onDelete
}) => {
    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
            isSelected
                ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm"
                : "border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300"
        }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200">
                        {classData.code}
                    </span>
                    <Badge color={classData.isActive ? "success" : "light"}>
                        {classData.isActive ? "Aktif" : "Tidak Aktif"}
                    </Badge>
                </div>
                <Checkbox checked={isSelected} onChange={onToggle} />
            </div>

            {/* Body */}
            <div className="px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
                        {classData.name}
                    </p>
                </div>
                
                {/* Meta info */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <UserIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium truncate max-w-[120px]">
                            {classData.homeroomTeacher?.name || "Tanpa Wali Kelas"}
                        </span>
                    </div>
                    {classData.roomNumber && (
                        <div className="flex items-center gap-1.5">
                            <MapPinIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                            <span className="font-medium">Ruang {classData.roomNumber}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <GroupIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">{classData.maxCapacity || "-"} Kapasitas</span>
                    </div>
                </div>
                
                {/* Level / Grade / Major tags */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {classData.educationLevel?.name && (
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/[0.05] dark:text-gray-300">
                            {classData.educationLevel.name}
                        </span>
                    )}
                    {classData.grade?.name && (
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/[0.05] dark:text-gray-300">
                            Tingkat {classData.grade.name}
                        </span>
                    )}
                    {classData.major?.name && (
                        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/[0.05] dark:text-gray-300">
                            {classData.major.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
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

export default ClassCard;
