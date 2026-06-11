import React from "react";
import { GuestVisit } from "../../api/types/system";
import {
    PencilIcon,
    TrashBinIcon,
    CheckCircleIcon,
    TimeIcon,
    DocsIcon
} from "../../components/atoms/Icons";
import Badge from "../../components/atoms/Badge";
import TableActionMenu from "../../components/molecules/TableActionMenu";
import DropdownItem from "../../components/atoms/DropdownItem";

interface GuestVisitCardProps {
    visit: GuestVisit;
    onEdit: () => void;
    onDelete: () => void;
    onCheckIn?: () => void;
    onCheckOut?: () => void;
    onViewDetail?: () => void;
}

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
        return new Date(dateString).toLocaleDateString("en-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return dateString;
    }
};

const getStatusBadge = (status: string | null | undefined) => {
    const s = status?.toLowerCase() || "scheduled";
    switch (s) {
        case "completed":
            return <Badge color="success" size="sm" variant="light">Completed</Badge>;
        case "active":
            return <Badge color="primary" size="sm" variant="light" className="animate-pulse">Active</Badge>;
        case "scheduled":
            return <Badge color="warning" size="sm" variant="light">Scheduled</Badge>;
        default:
            return <Badge color="light" size="sm" variant="light">{status}</Badge>;
    }
};

const GuestVisitCard: React.FC<GuestVisitCardProps> = ({
    visit,
    onEdit,
    onDelete,
    onCheckIn,
    onCheckOut,
    onViewDetail
}) => {

    return (
        <div 
            className="rounded-2xl border border-gray-200 bg-white transition-all shadow-sm hover:border-gray-300 dark:border-white/[0.06] dark:bg-white/[0.02] cursor-pointer overflow-hidden relative"
            onClick={() => onViewDetail && onViewDetail()}
        >
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200 normal-case">
                        <TimeIcon className="size-3.5 mr-1.5 opacity-70" />
                        {formatDate(visit.checkIn || visit.checkInTime || visit.visitDate)}
                    </span>
                </div>
                {getStatusBadge(visit.status)}
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold dark:bg-brand-500/10 text-sm">
                        {visit.guest?.photoUrl ? (
                            <img src={visit.guest.photoUrl} alt={visit.guest.name} className="size-full rounded-xl object-cover" />
                        ) : (
                            visit.guest?.name?.charAt(0) || "G"
                        )}
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{visit.guest?.name || "Unknown"}</h3>
                        <span className="text-sm text-gray-500 line-clamp-1 mt-0.5">{visit.guest?.company || "Personal Visit"}</span>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <DocsIcon className="size-4 shrink-0 text-brand-500 opacity-70 mt-0.5" />
                        <span className="line-clamp-2">
                            {visit.purpose || "Meeting"}
                        </span>
                    </div>
                    
                    {(visit.checkOut || visit.checkOutTime) && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 p-2 rounded-lg dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05]">
                            <span className="block uppercase tracking-wider text-[10px] opacity-70 mb-0.5">Checked Out</span>
                            <span className="font-medium font-mono text-gray-700 dark:text-gray-300">{formatDate(visit.checkOut || visit.checkOutTime)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-4 py-2 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <div className="text-xs text-gray-500 font-medium">Actions</div>
                <div onClick={(e) => e.stopPropagation()}>
                    <TableActionMenu>
                        {onCheckIn && visit.status?.toLowerCase() === 'scheduled' && (
                            <DropdownItem
                                onClick={() => onCheckIn()}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                            >
                                <CheckCircleIcon className="size-3.5" /> Check In
                            </DropdownItem>
                        )}
                        {onCheckOut && visit.status?.toLowerCase() === 'active' && (
                            <DropdownItem
                                onClick={() => onCheckOut()}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            >
                                <CheckCircleIcon className="size-3.5" /> Check Out
                            </DropdownItem>
                        )}
                        <DropdownItem
                            onClick={() => onEdit()}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                        >
                            <PencilIcon className="size-3.5" /> Edit
                        </DropdownItem>
                        <DropdownItem
                            onClick={() => onDelete()}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                        >
                            <TrashBinIcon className="size-3.5" /> Delete
                        </DropdownItem>
                    </TableActionMenu>
                </div>
            </div>
        </div>
    );
};

export default GuestVisitCard;
