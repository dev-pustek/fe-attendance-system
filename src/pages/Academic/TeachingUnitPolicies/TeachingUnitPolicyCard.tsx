import React from "react";
import { TeachingUnitPolicy } from "../../../api/types/academic";
import { PencilIcon, TrashBinIcon, TimeIcon, CalenderIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";

interface TeachingUnitPolicyCardProps {
    policy: TeachingUnitPolicy;
    isSelected: boolean;
    onSelect: (id: string | number) => void;
    onEdit: (policy: TeachingUnitPolicy) => void;
    onDelete: (policy: TeachingUnitPolicy) => void;
}

const TeachingUnitPolicyCard: React.FC<TeachingUnitPolicyCardProps> = ({
    policy,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
}) => {
    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
            isSelected 
                ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm"
                : "border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300"
        }`}>
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200 uppercase">
                        {policy.academicYear?.code || "Tahun Tidak Diketahui"}
                    </span>
                    <Badge color={policy.isActive ? 'success' : 'error'}>
                        {policy.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
                <Checkbox 
                    checked={isSelected} 
                    onChange={() => onSelect(policy.id)} 
                />
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 shrink-0">
                        <TimeIcon className="size-5 text-brand-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                            {policy.minutesPerUnit} Minutes
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Duration per Unit (JP)
                        </p>
                    </div>
                </div>
                
                <div className="mt-4 border-t border-gray-50 pt-3 dark:border-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <CalenderIcon className="size-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {policy.academicYear?.name || "-"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(policy); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                >
                    <PencilIcon className="size-3.5" />Edit</button>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(policy); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                    <TrashBinIcon className="size-3.5" />Hapus</button>
            </div>
        </div>
    );
};

export default TeachingUnitPolicyCard;
