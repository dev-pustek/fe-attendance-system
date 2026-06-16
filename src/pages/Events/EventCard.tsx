import React from "react";
import { Event } from "../../api/types/events";
import Badge from "../../components/atoms/Badge";
import Checkbox from "../../components/atoms/Checkbox";
import Dropdown from "../../components/molecules/Dropdown";
import DropdownItem from "../../components/atoms/DropdownItem";
import TableActionMenu from "../../components/molecules/TableActionMenu";
import { 
    PencilIcon, 
    TrashBinIcon, 
    CalenderIcon, 
    UserIcon, 
    TimeIcon, 
    GroupIcon,
    MapPinIcon,
    QrScanIcon
} from "../../components/atoms/Icons";
import { useAuthStore } from "../../store/authStore";

interface EventCardProps {
  event: Event;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageInvites: () => void;
  onScan: () => void;
}

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const MoreHorizontalIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z" />
  </svg>
);

const EventCard: React.FC<EventCardProps> = ({
  event,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
  onManageInvites,
  onScan
}) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const isOrganizer = (event as any).organizerId === user?.id || (event as any).creator?.id === user?.id;
  const hasManageAccess = isAdmin || isOrganizer;
  const isScanner = hasManageAccess || ((event as any).invitations && (event as any).invitations.length > 0 && (event as any).invitations[0].isScanner);

  const getEventIcon = () => {
      switch(event.eventType) {
          case 'meeting': return <UserIcon className="size-4 text-blue-500" />;
          case 'training': return <TimeIcon className="size-4 text-amber-500" />;
          case 'ceremony': return <GroupIcon className="size-4 text-emerald-500" />;
          default: return <CalenderIcon className="size-4 text-gray-500" />;
      }
  };

  const getEventBadge = () => {
      if (event.isCancelled) return <Badge color="error">Dibatalkan</Badge>;
      if (new Date(event.startTime) > new Date()) return <Badge color="info">Akan Datang</Badge>;
      if (new Date(event.endTime) < new Date()) return <Badge color="warning">Berakhir</Badge>;
      return <Badge color="success">Berlangsung</Badge>;
  };

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
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold tracking-wide text-gray-700 shadow-sm border border-gray-200 dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-gray-200 capitalize">
            {getEventIcon()}
            {event.eventType === 'meeting' ? 'Pertemuan' : event.eventType === 'training' ? 'Pelatihan' : event.eventType === 'ceremony' ? 'Upacara' : 'Workshop'}
          </span>
          {getEventBadge()}
        </div>
        {hasManageAccess && <Checkbox checked={isSelected} onChange={onToggle} />}
      </div>

      {/* Card Body */}
      <div className="px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-1 text-left">
          <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight line-clamp-1">
            {event.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {event.description || "Tidak ada deskripsi"}
          </p>
        </div>

        {/* Location & Capacity */}
        <div className="mt-3 flex flex-col gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
           {event.location && (
             <div className="flex items-center gap-1.5">
               <MapPinIcon className="size-3.5 shrink-0 text-gray-400" />
               <span className="font-medium line-clamp-1">{event.location}</span>
             </div>
           )}
           <div className="flex items-center gap-1.5">
             <GroupIcon className="size-3.5 shrink-0 text-gray-400" />
             {event.capacity !== null ? (
               <div className="flex-1 flex items-center gap-2">
                 <span className="font-medium text-brand-600 dark:text-brand-400">{(event as any)._count?.invitations || (event as any).invitationsCount || 0} Terisi</span>
                 <span className="text-gray-400">/ {event.capacity}</span>
                 <div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
                    <div 
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${Math.min((((event as any)._count?.invitations || (event as any).invitationsCount || 0) / event.capacity) * 100, 100)}%` }}
                    />
                 </div>
               </div>
             ) : (
               <span className="font-medium">Tak Terbatas</span>
             )}
           </div>
        </div>

        {/* Duration */}
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-gray-50 p-2 text-[11px] sm:text-xs text-gray-600 dark:bg-white/[0.02] dark:text-gray-300">
          <CalenderIcon className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
          <div className="flex flex-col">
              <span className="font-medium">{formatDate(event.startTime)}</span>
              <span className="font-medium text-gray-400">s/d {formatDate(event.endTime)}</span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-4 py-3 sm:px-5 dark:border-white/[0.05] dark:bg-white/[0.01]">
        <div className="flex items-center gap-2">
            {hasManageAccess && (
              <button
              onClick={(e) => { e.stopPropagation(); onManageInvites(); }}
              disabled={event.isCancelled || new Date(event.endTime) < new Date()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
              >
              <GroupIcon className="size-3.5" /> Undangan
              </button>
            )}
            {isScanner && (
              <button
              onClick={(e) => { e.stopPropagation(); onScan(); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-[0_2px_8px_rgba(236,72,153,0.4)] active:scale-95"
              >
              <QrScanIcon className="size-3.5" /> Scan Kehadiran
              </button>
            )}
        </div>
        {hasManageAccess && (
          <div className="relative flex justify-end">
              <TableActionMenu>
                  <DropdownItem
                  onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  >
                  <PencilIcon className="size-3.5" /> Edit
                  </DropdownItem>
                  <DropdownItem
                  onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                  >
                  <TrashBinIcon className="size-3.5" /> Hapus
                  </DropdownItem>
              </TableActionMenu>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
