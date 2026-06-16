import React from "react";
import { LeaveSubmission, LeaveStatus } from "../../../api/types/leave";
import { CalenderIcon, PencilIcon, TrashBinIcon, EyeIcon } from "../../../components/atoms/Icons";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";

interface LeaveSubmissionCardProps {
    submission: LeaveSubmission;
    isSelected: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onReview: () => void;
}

const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
        case "approved": return "success";
        case "rejected": return "error";
        case "partially_approved": return "warning";
        default: return "light";
    }
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const LeaveSubmissionCard: React.FC<LeaveSubmissionCardProps> = ({
    submission,
    isSelected,
    onToggle,
    onEdit,
    onDelete,
    onReview
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
                        {submission.leaveType?.code || "Unknown"}
                    </span>
                    <Badge color={getStatusColor(submission.status)}>
                        {submission.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                </div>
                <Checkbox checked={isSelected} onChange={onToggle} />
            </div>

            {/* Body */}
            <div className="px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 overflow-hidden font-bold">
                        {submission.user?.photo ? (
                            <img src={submission.user.photo} alt={submission.user.name} className="h-full w-full object-cover" />
                        ) : (
                            submission.user?.name.charAt(0) || "U"
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-tight">
                            {submission.user?.name || "Unknown User"}
                        </p>
                        <p className="truncate text-xs text-gray-500 mt-0.5">
                            {submission.totalDays} Hari
                        </p>
                    </div>
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                        <CalenderIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">{formatDate(submission.startDate)}</span>
                        <span className="text-gray-300 dark:text-gray-600 px-0.5">—</span>
                        <span className="font-medium">{formatDate(submission.endDate)}</span>
                    </div>
                    {submission.reason && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1 bg-gray-50 dark:bg-white/[0.03] p-2 rounded-lg border border-gray-100 dark:border-white/5">
                            {submission.reason}
                        </p>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <button
                    onClick={(e) => { e.stopPropagation(); onReview(); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                    <EyeIcon className="size-3.5" /> Review
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                >
                    <PencilIcon className="size-3.5" /> Edit
                </button>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-1" />
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                    <TrashBinIcon className="size-3.5" /> Delete
                </button>
            </div>
        </div>
    );
};

export default LeaveSubmissionCard;
