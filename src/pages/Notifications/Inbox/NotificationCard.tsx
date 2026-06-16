import React from "react";
import { Notification } from "../../../api/types/notification";
import Badge from "../../../components/atoms/Badge";
import Checkbox from "../../../components/atoms/Checkbox";
import { PencilIcon, TrashBinIcon, CalenderIcon, CheckCircleIcon, CheckLineIcon } from "../../../components/atoms/Icons";
import { formatDistanceToNow } from "date-fns";

interface NotificationCardProps {
  notification: Notification;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleRead: () => void;
}

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
  onToggleRead
}) => {
  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isSelected
          ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/5 shadow-sm"
          : "border-gray-200 bg-white dark:border-white/[0.06] dark:bg-white/[0.02] shadow-sm hover:border-gray-300"
      } ${!notification.readAt && !isSelected ? "bg-brand-50/20 dark:bg-brand-500/5" : ""}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Badge color={notification.readAt ? "success" : "warning"}>
            {notification.readAt ? "Dibaca" : "Belum Dibaca"}
          </Badge>
          {!notification.readAt && <span className="flex size-2 rounded-full bg-brand-500 shadow-sm shadow-brand-500/40"></span>}
        </div>
        <Checkbox checked={isSelected} onChange={onToggle} />
      </div>

      {/* Card Body */}
      <div className="px-4 py-4 sm:px-5 cursor-pointer" onClick={onToggleRead}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
             <p className={`text-sm sm:text-base ${!notification.readAt ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-800 dark:text-gray-200'} leading-tight line-clamp-1`}>
              {notification.title}
             </p>
             <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
               {notification.message}
             </p>
          </div>
        </div>

        {/* Duration */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            <CalenderIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="font-medium">{notification.createdAt ? formatDate(notification.createdAt) : "—"}</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium text-gray-400">
             {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : ''}
          </span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleRead(); }}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
              notification.readAt 
              ? "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]" 
              : "text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
          }`}
        >
          {notification.readAt ? (
             <>
               <div className="size-3.5 rounded-full border-2 border-current opacity-60" /> Tandai Belum Dibaca
             </>
          ) : (
             <>
               <CheckLineIcon className="size-3.5" /> Tandai Dibaca
             </>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
          >
            <PencilIcon className="size-3.5" /> Edit
          </button>
          <div className="h-4 w-px bg-gray-200 dark:bg-white/[0.06] mx-0.5" />
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
          >
            <TrashBinIcon className="size-3.5" /> Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
