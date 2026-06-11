import React from "react";
import { Guest } from "../../api/types/system";
import Checkbox from "../../components/atoms/Checkbox";
import { UserIcon, EditIcon, TrashBinIcon, CheckCircleIcon } from "../../components/atoms/Icons";

interface GuestCardProps {
    guest: Guest;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onEdit: () => void;
    onDelete: () => void;
    onCheckIn: () => void;
}

const GuestCard: React.FC<GuestCardProps> = ({
    guest,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onCheckIn
}) => {
    return (
        <div className={`relative flex flex-col rounded-2xl border bg-white p-4 transition-all duration-200 dark:bg-white/[0.02] ${
            isSelected
                ? "border-brand-500 shadow-sm shadow-brand-500/10 dark:border-brand-500/50"
                : "border-gray-200 shadow-sm hover:border-brand-300 hover:shadow-md dark:border-white/[0.05] dark:hover:border-white/[0.1]"
        }`}>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        {guest.photoUrl ? (
                            <img src={guest.photoUrl} alt={guest.name} className="size-full rounded-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold">{guest.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 line-clamp-1 dark:text-white">{guest.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{guest.company || "No Company"}</p>
                    </div>
                </div>
                <div className="pt-1">
                    <Checkbox checked={isSelected} onChange={() => onSelect(String(guest.id || guest.public_id))} />
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-2 py-3">
                <div className="flex items-center gap-2">
                    <UserIcon className="size-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {guest.email || "No email"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-md dark:bg-white/[0.05] dark:text-gray-300 truncate">
                        {guest.phone || "No phone"}
                    </span>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 dark:border-white/[0.05]">
                <button
                    onClick={(e) => { e.stopPropagation(); onCheckIn(); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-100 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                >
                    <CheckCircleIcon className="size-3.5" /> Check In
                </button>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
                    >
                        <EditIcon className="size-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="flex size-8 items-center justify-center rounded-lg text-error-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10 dark:hover:text-error-500"
                    >
                        <TrashBinIcon className="size-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuestCard;
