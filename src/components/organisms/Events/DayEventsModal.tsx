import React from "react";
import Modal from "../../molecules/Modal";
import { useEvents } from "../../../api/hooks/useEvents";
import { Event } from "../../../api/types/events";
import Badge from "../../atoms/Badge";
import { PlusIcon, TimeIcon, GridIcon, AngleRightIcon, CloseIcon } from "../../atoms/Icons";

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  onAddEvent: (date: string) => void;
  onEditEvent: (event: Event) => void;
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({
  isOpen,
  onClose,
  date,
  onAddEvent,
  onEditEvent,
}) => {
  // Fetch events for this specific date
  const { data: response, isLoading } = useEvents({
    date: date,
    limit: 100, // Fetch all events for the day
  });

  // Sort events by start time
  const sortedEvents = React.useMemo(() => {
    const eventList = Array.isArray(response) ? response : response?.data || [];
    return [...eventList].sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [response]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getEventDuration = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = (e.getTime() - s.getTime()) / (1000 * 60); // minutes
    if (diff >= 60) {
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${diff}m`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-3xl mx-4 bg-gray-50 dark:bg-gray-900 overflow-hidden rounded-2xl">
      <div className="flex h-[600px] max-h-[80vh] flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/5 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {date ? formatDate(date) : "Selected Date"}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
               <span className="flex items-center gap-1">
                 <GridIcon className="size-3.5" />
                 {sortedEvents.length} Events
               </span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                    onClose();
                    onAddEvent(date);
                }}
                className="group flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-brand-500 pl-3 pr-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-600 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
                    <PlusIcon className="size-4 text-white fill-white" />
                </div>
                Schedule Event
              </button>
              <button 
                onClick={onClose}
                className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <CloseIcon className="size-5" />
              </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
                <div className="size-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                <span className="text-sm font-medium">Loading schedule...</span>
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
               <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gray-100 dark:bg-white/5">
                    <GridIcon className="size-8 text-gray-400" />
               </div>
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No events scheduled</h3>
               <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  There are no events scheduled for this day. You can add one by clicking the button above.
               </p>
            </div>
          ) : (
            <div className="relative">
                {/* Timeline Line - Aligned with the center of the Node column
                    Mobile: Node col is 1rem wide. Center = 0.5rem.
                    Desktop: Time (5rem) + Gap (1rem) + Node center (0.5rem) = 6.5rem 
                */}
                <div className="absolute left-[0.5rem] md:left-[6.5rem] top-4 bottom-4 w-px bg-gray-200 dark:bg-white/10" />

                <div className="space-y-6">
                    {sortedEvents.map((event: Event) => {
                        const isUpcoming = new Date(event.startTime) > new Date();
                        const isPast = new Date(event.endTime) < new Date();
                        const isNow = !isUpcoming && !isPast;
                        
                        return (
                            <div key={event.public_id} className="group relative grid grid-cols-[1rem_1fr] gap-2 md:grid-cols-[5rem_1rem_1fr] md:gap-4">
                                {/* Time Column - Hidden on Mobile */}
                                <div className="hidden md:flex flex-col items-end text-right pt-4">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[10px] font-medium text-gray-400 mt-0.5">
                                        {getEventDuration(event.startTime, event.endTime)}
                                    </span>
                                </div>

                                {/* Timeline Node */}
                                <div className="relative flex justify-center pt-4">
                                     <div className={`
                                        z-10 size-3 rounded-full border-2 ring-4 ring-gray-50 dark:ring-gray-900
                                        ${event.isCancelled ? 'border-error-500 bg-white dark:bg-gray-900' :
                                          isNow ? 'border-brand-500 bg-brand-500 animate-pulse' :
                                          'border-gray-400 bg-white dark:border-gray-600 dark:bg-gray-800'}
                                    `} />
                                </div>

                                {/* Event Card */}
                                <div
                                    onClick={() => {
                                        onClose();
                                        onEditEvent(event);
                                    }}
                                    className={`
                                        cursor-pointer overflow-hidden rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-md
                                        ${event.isCancelled 
                                            ? 'border-error-200 bg-error-50/10 hover:border-error-300 dark:border-error-500/20 dark:bg-error-500/5' 
                                            : 'border-white bg-white hover:border-brand-200 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10'}
                                    `}
                                >
                                    <div className="flex items-stretch">
                                        {/* Color Stripe based on type */}
                                        <div className={`w-1.5 shrink-0 ${
                                            event.isCancelled ? 'bg-error-500' :
                                            event.eventType === 'meeting' ? 'bg-blue-500' :
                                            event.eventType === 'training' ? 'bg-amber-500' :
                                            event.eventType === 'ceremony' ? 'bg-emerald-500' :
                                            'bg-purple-500'
                                        }`} />
                                        
                                        <div className="flex-1 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                            event.eventType === 'meeting' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' :
                                                            event.eventType === 'training' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300' :
                                                            event.eventType === 'ceremony' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300' :
                                                            'bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300'
                                                        }`}>
                                                            {event.eventType}
                                                        </span>
                                                        {event.isCancelled && <Badge color="error" size="sm">Cancelled</Badge>}
                                                    </div>
                                                    <h3 className={`font-bold ${event.isCancelled ? 'text-gray-500 line-through decoration-error-500/50' : 'text-gray-900 dark:text-white'}`}>
                                                        {event.name}
                                                    </h3>
                                                </div>
                                                <div className="rounded-lg p-1.5 text-gray-300 transition-colors group-hover:bg-gray-100 group-hover:text-brand-600 dark:group-hover:bg-white/10 dark:group-hover:text-brand-400">
                                                    <AngleRightIcon className="size-4" />
                                                </div>
                                            </div>

                                            <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {event.description}
                                            </p>

                                            {event.isCancelled && event.cancellationReason && (
                                                <div className="mt-3 rounded-lg border border-error-100 bg-error-50 p-2 text-xs italic text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
                                                    "{event.cancellationReason}"
                                                </div>
                                            )}

                                            <div className="mt-4 flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1.5">
                                                    <TimeIcon className="size-3.5" />
                                                    <span>
                                                        {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-400">@</span>
                                                    <span className="uppercase tracking-wide">{event.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DayEventsModal;
