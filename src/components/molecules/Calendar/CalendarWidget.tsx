import React, { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg, EventMountArg, CustomButtonInput, EventApi } from "@fullcalendar/core";

interface CalendarWidgetProps {
  events: EventInput[];
  onDateSelect?: (selectInfo: DateSelectArg) => void;
  onEventClick?: (clickInfo: EventClickArg) => void;
  headerToolbar?: {
    left: string;
    center: string;
    right: string;
  };
  onEventRightClick?: (mountInfo: EventMountArg, x: number, y: number) => void;
  initialView?: string;
  customButtons?: Record<string, CustomButtonInput>;
  allDaySlot?: boolean;
  slotMinTime?: string;
  slotMaxTime?: string;
  hiddenDays?: number[];
  dayHeaderFormat?: Record<string, unknown>;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  events,
  onDateSelect,
  onEventClick,
  headerToolbar,
  customButtons,
  onEventRightClick,
  initialView = "dayGridMonth",
  allDaySlot = true,
  slotMinTime = "00:00:00",
  slotMaxTime = "24:00:00",
  hiddenDays = [],
  dayHeaderFormat
}) => {
  const calendarRef = useRef<FullCalendar>(null);

  const renderEventContent = (eventInfo: { event: EventApi; timeText: string }) => {
    // Custom render logic or simple
    // If extendedProps.calendar is present, use it for color class like in Calendar.tsx
    const colorLevel = eventInfo.event.extendedProps?.calendar || "primary";
    const colorClass = `fc-bg-${colorLevel.toLowerCase()}`;
    const teacherName = eventInfo.event.extendedProps?.teacherName;
    const plannedUnits = eventInfo.event.extendedProps?.plannedUnits;
    const className = eventInfo.event.extendedProps?.className;
    
    return (
      <div className={`event-fc-color flex flex-col fc-event-main ${colorClass} p-1.5 rounded-md w-full overflow-hidden text-xs shadow-sm border border-black/5`}>
        <div className="flex flex-col gap-0.5 mb-1 flex-1">
          <div className="flex items-center gap-1.5 ">
            <div className="fc-daygrid-event-dot"></div>
            <div className="fc-event-title font-bold truncate leading-tight flex-1">{eventInfo.event.title}</div>
          </div>
          {className && <div className="text-[10px] text-gray-700/80 font-medium ml-3 truncate">{className}</div>}
        </div>
        
        {(teacherName || plannedUnits) && (
          <div className="flex items-center justify-between mt-auto pt-1 border-t border-black/5 opacity-80 text-[10px]">
            {teacherName && <span className="truncate max-w-[70%]">{teacherName.split(' ')[0]}</span>}
            {plannedUnits && <span className="font-semibold bg-white/20 px-1 rounded">{plannedUnits} JP</span>}
          </div>
        )}
        
        {/* If no extra info, show time text at least */}
        {!teacherName && !plannedUnits && (
          <div className="fc-event-time opacity-70 mt-0.5 ml-3">{eventInfo.timeText}</div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={headerToolbar || {
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            selectable={!!onDateSelect}
            select={onDateSelect}
            eventClick={onEventClick}
            eventContent={renderEventContent}
            customButtons={customButtons}
            dayMaxEvents={3} // Show "more" link if too many events
            height="auto" // Adjust height automatically
            allDaySlot={allDaySlot}
            slotMinTime={slotMinTime}
            slotMaxTime={slotMaxTime}
            hiddenDays={hiddenDays}
            dayHeaderFormat={dayHeaderFormat}
            eventDidMount={(info) => {
              if (onEventRightClick) {
                info.el.addEventListener("contextmenu", (e) => {
                  e.preventDefault();
                  onEventRightClick(info, e.clientX, e.clientY);
                });
              }
            }}
          />
        </div>
    </div>
  );
};

export default CalendarWidget;
