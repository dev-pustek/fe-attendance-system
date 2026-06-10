import React from "react";
import { ParentProfile } from "../../../api/types/profiles";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";
import { PencilIcon, TrashBinIcon, UserCircleIcon } from "../../../components/atoms/Icons";

interface ParentCardProps {
    parent: ParentProfile;
    isSelected: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onViewChildren: () => void;
    onViewDetail: () => void;
}

const ParentCard: React.FC<ParentCardProps> = ({
    parent,
    isSelected,
    onToggle,
    onEdit,
    onDelete,
    onViewChildren,
    onViewDetail,
}) => {
    return (
        <div 
            onClick={onViewDetail}
            className={`rounded-2xl border overflow-hidden cursor-pointer transition-all ${
            isSelected
                ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm"
                : "border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300"
        }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs shadow-sm border border-gray-200 dark:border-white/[0.06] overflow-hidden bg-white dark:bg-white/[0.05] ${!parent.user?.photo ? 'text-brand-600 dark:text-brand-400' : ''}`}>
                        {parent.user?.photo ? (
                            <img src={parent.user.photo} alt={parent.user.name} className="size-full object-cover" />
                        ) : (
                            parent.user?.name?.charAt(0) || "P"
                        )}
                    </div>
                    <Badge color={parent.user?.isActive ? "success" : "light"}>
                        {parent.user?.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge color="info">
                        {parent.relationship.toUpperCase()}
                    </Badge>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onChange={onToggle} />
                </div>
            </div>

            {/* Body */}
            <div className="px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight mb-1">
                            {parent.user?.name || "Unknown Parent"}
                        </p>
                        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                            {parent.user?.email || "No email linked"}
                        </p>
                    </div>
                </div>
                
                <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-gray-400 w-16">Occ/Edu:</span>
                        <span className="font-semibold">{parent.occupation || "-"} / {parent.education || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-gray-400 w-16">Children:</span>
                        {parent.students && parent.students.length > 0 ? (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                    {parent.students.length} Student{parent.students.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewChildren(); }}
                                    className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline uppercase tracking-wide"
                                >
                                    See More
                                </button>
                            </div>
                        ) : (
                            <span className="italic text-gray-400">No children linked</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04] transition-colors">
                    <PencilIcon className="size-3.5" /> Edit
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 transition-colors">
                    <TrashBinIcon className="size-3.5" /> Delete
                </button>
            </div>
        </div>
    );
};

export default ParentCard;
